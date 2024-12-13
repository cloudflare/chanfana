import { ApiException, type InputValidationException } from "../../exceptions";
import { CreateEndpoint } from "../create";
import type { Logger, O } from "../types";

export class D1CreateEndpoint<HandleArgs extends Array<object> = Array<object>> extends CreateEndpoint<HandleArgs> {
  dbName = "DB";
  logger?: Logger;
  constraintsMessages: Record<string, InputValidationException> = {};

  getDBBinding(): D1Database {
    const env = this.params.router.getBindings(this.args);
    if (env[this.dbName] === undefined) {
      throw new ApiException(`Binding "${this.dbName}" is not defined in worker`);
    }

    if (env[this.dbName].prepare === undefined) {
      throw new ApiException(`Binding "${this.dbName}" is not a D1 binding`);
    }

    return env[this.dbName];
  }

  async create(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
    let inserted;
    try {
      const result = await this.getDBBinding()
        .prepare(
          `INSERT INTO ${this.meta.model.tableName} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data)
            .map(() => "?")
            .join(", ")}) RETURNING *`,
        )
        .bind(...Object.values(data))
        .all();

      inserted = result.results[0] as O<typeof this.meta>;
    } catch (e: any) {
      if (this.logger)
        this.logger.error(`Caught exception while trying to create ${this.meta.model.tableName}: ${e.message}`);
      if (e.message.includes("UNIQUE constraint failed")) {
        const constraintMessage = e.message.split("UNIQUE constraint failed:")[1].split(":")[0].trim();
        if (this.constraintsMessages[constraintMessage]) {
          throw this.constraintsMessages[constraintMessage];
        }
      }

      throw new ApiException(e.message);
    }

    if (this.logger) this.logger.log(`Successfully created ${this.meta.model.tableName}`);

    return inserted;
  }
}
