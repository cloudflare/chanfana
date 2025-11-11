import { ApiException } from "../../exceptions";
import { ListEndpoint } from "../list";
import type { Logger } from "../types";

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

  async list(filters: any) {
    // safe pagination defaults
    const perPage = Number(filters?.options?.per_page) || 20;
    const page = Math.max(1, Number(filters?.options?.page) || 1);
    const limit = perPage;
    const offset = Math.max(0, (page - 1) * perPage);

    const conditions: string[] = [];
    const conditionsParams: any[] = [];

    for (const f of filters.filters || []) {
      if (this.searchFields && f.field === this.searchFieldName) {
        const searchCondition = (this.searchFields || [])
          .map((obj) => `UPPER(${obj}) like UPPER(?${conditionsParams.length + 1})`)
          .join(" or ");
        conditions.push(`(${searchCondition})`);
        conditionsParams.push(`%${f.value}%`);
      } else if (f.operator === "EQ") {
        conditions.push(`${f.field} = ?${conditionsParams.length + 1}`);
        conditionsParams.push(f.value);
      } else {
        throw new ApiException(`operator ${f.operator} Not implemented`);
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Safe ORDER BY resolution (white-list + fallback)
    const providedOrderBy = filters?.options?.order_by;
    const providedOrderDir = (filters?.options?.order_by_direction || "ASC").toUpperCase();

    let orderByCol: string | null = null;
    if (typeof providedOrderBy === "string" && providedOrderBy !== "undefined") {
      if (Array.isArray(this.orderByFields) && this.orderByFields.length > 0) {
        if (this.orderByFields.includes(providedOrderBy)) {
          orderByCol = providedOrderBy;
        }
      }
    }

    if (!orderByCol) {
      if (typeof this.defaultOrderBy === "string" && this.defaultOrderBy !== "undefined") {
        orderByCol = this.defaultOrderBy;
      } else if (Array.isArray(this.meta?.model?.primaryKeys) && this.meta.model.primaryKeys[0]) {
        orderByCol = `${this.meta.model.primaryKeys[0]} DESC`;
      }
    }

    let orderBy = "";
    if (orderByCol) {
      if (/\s+(ASC|DESC)$/i.test(orderByCol)) {
        orderBy = `ORDER BY ${orderByCol}`;
      } else {
        const safeDir = providedOrderDir === "DESC" ? "DESC" : "ASC";
        orderBy = `ORDER BY ${orderByCol} ${safeDir}`;
      }
    }

    const finalSql = `SELECT * FROM ${this.meta.model.tableName} ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    this.logger?.debug?.("[D1ListEndpoint] SQL", finalSql, conditionsParams);

    const results = await this.getDBBinding()
      .prepare(finalSql)
      .bind(...conditionsParams)
      .all();
    const total_count = await this.getDBBinding()
      .prepare(`SELECT count(*) as total FROM ${this.meta.model.tableName} ${where}`)
      .bind(...conditionsParams)
      .all();

    return {
      result: results.results,
      result_info: {
        count: results.results.length,
        page,
        per_page: perPage,
        total_count: total_count.results[0]?.total,
      },
    };
  }
}
