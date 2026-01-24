import type { InputValidationException } from "../../exceptions";
import type { Filters, Logger, O, UpdateFilters } from "../types";
import { UpdateEndpoint } from "../update";
import {
  buildPrimaryKeyFilters,
  buildWhereClause,
  getD1Binding,
  handleDbError,
  validateColumnName,
  validateTableName,
} from "./base";

/**
 * D1-specific UpdateEndpoint implementation.
 * Provides automatic UPDATE operations with SQL injection prevention.
 */
export class D1UpdateEndpoint<HandleArgs extends Array<object> = Array<object>> extends UpdateEndpoint<HandleArgs> {
  /** Name of the D1 database binding in the worker environment. Defaults to "DB" */
  dbName = "DB";
  /** Optional logger for debugging and error tracking */
  logger?: Logger;
  /** Custom error messages for UNIQUE constraint violations. Keys are constraint names (e.g., "users.email") */
  constraintsMessages: Record<string, InputValidationException> = {};

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
   * Builds safe filters that only apply to primary keys.
   * @param filters - Filters object containing all filter conditions
   * @returns SafeFilters with validated conditions and parameters
   */
  protected getSafeFilters(filters: Filters) {
    return buildPrimaryKeyFilters(filters, this.meta.model.primaryKeys, this.getValidColumns());
  }

  /**
   * Fetches the existing object before update.
   * @param filters - Filter conditions for finding the object
   * @returns The existing record or null if not found
   */
  async getObject(filters: Filters): Promise<Record<string, unknown> | null> {
    const tableName = validateTableName(this.meta.model.tableName);
    const safeFilters = this.getSafeFilters(filters);
    const whereClause = buildWhereClause(safeFilters.conditions);

    const sql = `SELECT * FROM ${tableName} ${whereClause} LIMIT 1`;

    if (this.logger) {
      this.logger.debug?.(`[D1UpdateEndpoint] getObject SQL: ${sql}`);
    }

    const oldObj = await this.getDBBinding()
      .prepare(sql)
      .bind(...safeFilters.conditionsParams)
      .all();

    if (!oldObj.results || oldObj.results.length === 0) {
      return null;
    }

    return oldObj.results[0] as O<typeof this._meta>;
  }

  /**
   * Updates a record in the database.
   * @param _oldObj - The existing record (for reference)
   * @param filters - Filter conditions and data to update
   * @returns The updated record
   * @throws ApiException on database errors
   */
  async update(_oldObj: O<typeof this._meta>, filters: UpdateFilters): Promise<O<typeof this._meta>> {
    const tableName = validateTableName(this.meta.model.tableName);
    const validColumns = this.getValidColumns();
    const safeFilters = this.getSafeFilters(filters);
    const whereClause = buildWhereClause(safeFilters.conditions);

    // Validate and build SET clause
    const updateColumns = Object.keys(filters.updatedData);
    const updateValues = Object.values(filters.updatedData);

    // Build SET clause with proper parameter indices (starting after condition params)
    const setClause = updateColumns
      .map((col, i) => {
        const validatedCol = validateColumnName(col, validColumns);
        return `${validatedCol} = ?${safeFilters.conditionsParams.length + i + 1}`;
      })
      .join(", ");

    const sql = `UPDATE ${tableName} SET ${setClause} ${whereClause} RETURNING *`;

    if (this.logger) {
      this.logger.debug?.(`[D1UpdateEndpoint] update SQL: ${sql}`);
    }

    try {
      const obj = await this.getDBBinding()
        .prepare(sql)
        .bind(...safeFilters.conditionsParams, ...updateValues)
        .all();

      const result = obj.results[0] as O<typeof this._meta>;

      if (this.logger) {
        this.logger.log(`Successfully updated record in ${tableName}`);
      }

      return result;
    } catch (e: unknown) {
      handleDbError(e as Error, this.constraintsMessages, this.logger, `update ${tableName}`);
    }
  }
}
