import { ApiException } from "../../exceptions";
import { ListEndpoint } from "../list";
import type { Logger } from "../types";
import {
  buildOrderByClause,
  buildWhereClause,
  getD1Binding,
  validateColumnName,
  validateOrderByColumn,
  validateOrderDirection,
  validateTableName,
} from "./base";

/**
 * D1-specific ListEndpoint implementation.
 * Provides automatic SELECT with pagination, filtering, and ordering.
 * Includes SQL injection prevention for all query components.
 */
export class D1ListEndpoint<HandleArgs extends Array<object> = Array<object>> extends ListEndpoint<HandleArgs> {
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
   * Lists records with pagination, filtering, and ordering.
   * @param filters - Filter conditions and pagination options
   * @returns Object containing results and pagination info
   */
  async list(filters: {
    filters?: Array<{ field: string; operator: string; value: unknown }>;
    options?: {
      per_page?: number;
      page?: number;
      order_by?: string;
      order_by_direction?: string;
    };
  }) {
    const tableName = validateTableName(this.meta.model.tableName);
    const validColumns = this.getValidColumns();

    // Safe pagination defaults
    const perPage = Math.min(Math.max(1, Number(filters?.options?.per_page) || 20), 100);
    const page = Math.max(1, Number(filters?.options?.page) || 1);
    const limit = perPage;
    const offset = Math.max(0, (page - 1) * perPage);

    // Build filter conditions
    const conditions: string[] = [];
    const conditionsParams: unknown[] = [];

    for (const f of filters?.filters || []) {
      // Handle search field specially
      if (this.searchFields && this.searchFields.length > 0 && f.field === this.searchFieldName) {
        // Validate all search fields
        const validatedSearchFields = this.searchFields.map((col) => validateColumnName(col, validColumns));

        const searchCondition = validatedSearchFields
          .map((col) => `UPPER(${col}) LIKE UPPER(?${conditionsParams.length + 1})`)
          .join(" OR ");

        conditions.push(`(${searchCondition})`);
        conditionsParams.push(`%${f.value}%`);
      } else if (f.operator === "EQ") {
        // Validate filter column
        const validatedColumn = validateColumnName(f.field, validColumns);
        conditions.push(`${validatedColumn} = ?${conditionsParams.length + 1}`);
        conditionsParams.push(f.value);
      } else {
        throw new ApiException(`Operator "${f.operator}" is not implemented`);
      }
    }

    const whereClause = buildWhereClause(conditions);

    // Build safe ORDER BY clause
    const orderByFields = Array.isArray(this.orderByFields) ? this.orderByFields : [];
    const primaryKey = this.meta?.model?.primaryKeys?.[0] || "id";

    // Determine the fallback column (defaultOrderBy or first primary key)
    const fallbackColumn =
      typeof this.defaultOrderBy === "string" && this.defaultOrderBy !== "undefined" ? this.defaultOrderBy : primaryKey;

    // Get validated order column
    const orderColumn = validateOrderByColumn(filters?.options?.order_by, orderByFields, fallbackColumn);

    const orderDirection = validateOrderDirection(filters?.options?.order_by_direction);
    const orderByClause = buildOrderByClause(orderColumn, orderDirection);

    // Build final SQL
    const dataSql = `SELECT * FROM ${tableName} ${whereClause} ${orderByClause} LIMIT ${limit} OFFSET ${offset}`;
    const countSql = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;

    if (this.logger) {
      this.logger.debug?.(`[D1ListEndpoint] SQL: ${dataSql}`, conditionsParams);
    }

    // Execute queries
    const [results, totalCount] = await Promise.all([
      this.getDBBinding()
        .prepare(dataSql)
        .bind(...conditionsParams)
        .all(),
      this.getDBBinding()
        .prepare(countSql)
        .bind(...conditionsParams)
        .all(),
    ]);

    return {
      result: results.results,
      result_info: {
        count: results.results.length,
        page,
        per_page: perPage,
        total_count: (totalCount.results[0] as { total: number })?.total ?? 0,
      },
    };
  }
}
