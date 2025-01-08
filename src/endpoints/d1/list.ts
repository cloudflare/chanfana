import { ApiException } from "../../exceptions";
import { ListEndpoint } from "../list";
import type { ListFilters, ListResult, Logger, O } from "../types";

export class D1ListEndpoint<HandleArgs extends Array<object> = Array<object>> extends ListEndpoint<HandleArgs> {
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

  async list(filters: ListFilters): Promise<ListResult<O<typeof this.meta>> & { result_info: object }> {
    const offset = (filters.options.per_page || 20) * (filters.options.page || 0) - (filters.options.per_page || 20);
    const limit = filters.options.per_page;

    const conditions: string[] = [];
    const conditionsParams: string[] = [];

    for (const f of filters.filters) {
      if (this.searchFields && f.field === this.searchFieldName) {
        const searchCondition = this.searchFields
          .map((obj) => {
            return `UPPER(${obj}) like UPPER(?${conditionsParams.length + 1})`;
          })
          .join(" or ");
        conditions.push(`(${searchCondition})`);
        conditionsParams.push(`%${f.value}%`);
      } else if (f.operator === "EQ") {
        conditions.push(`${f.field} = ?${conditionsParams.length + 1}`);
        conditionsParams.push(f.value as any);
      } else {
        throw new ApiException(`operator ${f.operator} Not implemented`);
      }
    }

    let where = "";
    if (conditions.length > 0) {
      where = `WHERE ${conditions.join(" AND ")}`;
    }

    let orderBy = `ORDER BY ${this.defaultOrderBy || `${this.meta.model.primaryKeys[0]} DESC`}`;
    if (filters.options.order_by) {
      orderBy = `ORDER BY ${filters.options.order_by} ${filters.options.order_by_direction || "ASC"}`;
    }

    const results = await this.getDBBinding()
      .prepare(`SELECT * FROM ${this.meta.model.tableName} ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`)
      .bind(...conditionsParams)
      .all();

    const total_count = await this.getDBBinding()
      .prepare(`SELECT count(*) as total FROM ${this.meta.model.tableName} ${where} LIMIT ${limit}`)
      .bind(...conditionsParams)
      .all();

    return {
      result: results.results,
      result_info: {
        count: results.results.length,
        page: filters.options.page,
        per_page: filters.options.per_page,
        total_count: total_count.results[0]?.total,
      },
    };
  }
}
