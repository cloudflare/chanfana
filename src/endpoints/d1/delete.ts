import { ApiException } from "../../exceptions";
import { DeleteEndpoint } from "../delete";
import type { Filters, Logger, O } from "../types";

export class D1DeleteEndpoint<HandleArgs extends Array<object> = Array<object>> extends DeleteEndpoint<HandleArgs> {
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

  getSafeFilters(filters: Filters) {
    const conditions: string[] = [];
    const conditionsParams: string[] = [];

    for (const f of filters.filters) {
      if (f.operator === "EQ") {
        conditions.push(`${f.field} = ?${conditionsParams.length + 1}`);
        conditionsParams.push(f.value as any);
      } else {
        throw new ApiException(`operator ${f.operator} Not implemented`);
      }
    }

    return { conditions, conditionsParams };
  }

  async getObject(filters: Filters): Promise<O<typeof this.meta> | null> {
    const safeFilters = this.getSafeFilters(filters);

    const oldObj = await this.getDBBinding()
      .prepare(`SELECT * FROM ${this.meta.model.tableName} WHERE ${safeFilters.conditions.join(" AND ")} LIMIT 1`)
      .bind(...safeFilters.conditionsParams)
      .all();

    if (!oldObj.results || oldObj.results.length === 0) {
      return null;
    }

    return oldObj.results[0] as O<typeof this.meta>;
  }

  async delete(oldObj: O<typeof this.meta>, filters: Filters): Promise<O<typeof this.meta> | null> {
    const safeFilters = this.getSafeFilters(filters);

    let result;
    try {
      result = await this.getDBBinding()
        .prepare(
          `DELETE FROM ${this.meta.model.tableName} WHERE ${safeFilters.conditions.join(" AND ")} RETURNING * LIMIT 1`,
        )
        .bind(...safeFilters.conditionsParams)
        .all();
    } catch (e: any) {
      if (this.logger)
        this.logger.error(`Caught exception while trying to delete ${this.meta.model.tableName}: ${e.message}`);
      throw new ApiException(e.message);
    }

    if (result.meta.changes === 0) {
      return null;
    }

    if (this.logger) this.logger.log(`Successfully deleted ${this.meta.model.tableName}`);

    return oldObj;
  }
}
