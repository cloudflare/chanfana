import { ReadEndpoint } from "../read";
import type { ListFilters, Logger, O } from "../types";
import { buildSafeFilters, buildWhereClause, getD1Binding, validateTableName } from "./base";

/**
 * D1-specific ReadEndpoint implementation.
 * Provides automatic SELECT operations with SQL injection prevention.
 */
export class D1ReadEndpoint<HandleArgs extends Array<object> = Array<object>> extends ReadEndpoint<HandleArgs> {
  /** Name of the D1 database binding in the worker environment. Defaults to "DB" */
  dbName = "DB";
  /** Optional logger for debugging and error tracking */
  logger?: Logger;

  /**
   * Gets the D1 database binding from the worker environment.
   * @returns D1Database instance
   * @throws ApiException if binding is not defined or is not a D1 binding
   */
  getDBBinding(): D1Database {
    return getD1Binding((args) => this.params.router.getBindings(args), this.args, this.dbName);
  }

  /**
   * Gets the list of valid column names from the model schema.
   * @returns Array of valid column names
   */
  protected getValidColumns(): string[] {
    return Object.keys(this.meta.model.schema.shape);
  }

  /**
   * Fetches a single record from the database.
   * @param filters - Filter conditions for the query
   * @returns The found record or null if not found
   */
  async fetch(filters: ListFilters): Promise<O<typeof this._meta> | null> {
    const tableName = validateTableName(this.meta.model.tableName);
    const validColumns = this.getValidColumns();

    // Build safe filters with validated column names
    const safeFilters = buildSafeFilters(filters.filters, validColumns);
    const whereClause = buildWhereClause(safeFilters.conditions);

    const sql = `SELECT * FROM ${tableName} ${whereClause} LIMIT 1`;

    if (this.logger) {
      this.logger.debug?.(`[D1ReadEndpoint] SQL: ${sql}`);
    }

    const obj = await this.getDBBinding()
      .prepare(sql)
      .bind(...safeFilters.conditionsParams)
      .all();

    if (!obj.results || obj.results.length === 0) {
      return null;
    }

    return obj.results[0] as O<typeof this._meta>;
  }
}
