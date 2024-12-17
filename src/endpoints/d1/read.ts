import { ApiException } from "../../exceptions";
import { ReadEndpoint } from "../read";
import type { ListFilters, Logger, O } from "../types";

export class D1ReadEndpoint<HandleArgs extends Array<object> = Array<object>> extends ReadEndpoint<HandleArgs> {
  dbName = "DB";
  logger?: Logger;

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

  async fetch(filters: ListFilters): Promise<O<typeof this.meta> | null> {
    const conditions = filters.filters.map((obj) => `${obj.field} = ?`);

    const obj = await this.getDBBinding()
      .prepare(`SELECT * FROM ${this.meta.model.tableName} WHERE ${conditions.join(" AND ")} LIMIT 1`)
      .bind(...filters.filters.map((obj) => obj.value))
      .all();

    if (!obj.results || obj.results.length === 0) {
      return null;
    }

    return obj.results[0] as O<typeof this.meta>;
  }
}
