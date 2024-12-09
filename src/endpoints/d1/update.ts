import { ApiException } from "../../exceptions";
import type { Logger, O, UpdateFilters } from "../types";
import { UpdateEndpoint } from "../update";

export class D1UpdateEndpoint<HandleArgs extends Array<object> = Array<object>> extends UpdateEndpoint<HandleArgs> {
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

  getSafeFilters(filters: UpdateFilters) {
    // Filters should only apply to primary keys
    const safeFilters = filters.filters.filter((f) => {
      return this.meta.model.primaryKeys.includes(f.field);
    });

    const conditions: string[] = [];
    const conditionsParams: string[] = [];

    for (const f of safeFilters) {
      if (f.operator === "EQ") {
        conditions.push(`${f.field} = ?${conditionsParams.length + 1}`);
        conditionsParams.push(f.value as any);
      } else {
        throw new ApiException(`operator ${f.operator} Not implemented`);
      }
    }

    return { conditions, conditionsParams };
  }

  async getObject(filters: UpdateFilters): Promise<object | null> {
    const safeFilters = this.getSafeFilters(filters);

    const oldObj = await this.getDBBinding()
      .prepare(
        `SELECT *
                                                      FROM ${this.meta.model.tableName} WHERE ${safeFilters.conditions.join(" AND ")} LIMIT 1`,
      )
      .bind(...safeFilters.conditionsParams)
      .all();

    if (!oldObj.results || oldObj.results.length === 0) {
      return null;
    }

    return oldObj.results[0] as O<typeof this.meta>;
  }

  async update(oldObj: O<typeof this.meta>, filters: UpdateFilters): Promise<O<typeof this.meta>> {
    const safeFilters = this.getSafeFilters(filters);

    let result;
    try {
      const obj = await this.getDBBinding()
        .prepare(
          `UPDATE ${this.meta.model.tableName} SET ${Object.keys(filters.updatedData).map((key, index) => `${key} = ?${safeFilters.conditionsParams.length + index + 1}`)} WHERE ${safeFilters.conditions.join(" AND ")} RETURNING *`,
        )
        .bind(...safeFilters.conditionsParams, ...Object.values(filters.updatedData))
        .all();

      result = obj.results[0];
    } catch (e: any) {
      if (this.logger)
        this.logger.error(`Caught exception while trying to update ${this.meta.model.tableName}: ${e.message}`);
      throw new ApiException(e.message);
    }

    if (this.logger) this.logger.log(`Successfully updated ${this.meta.model.tableName}`);

    return result as O<typeof this.meta>;
  }
}
