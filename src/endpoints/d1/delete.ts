import { ApiException } from "../../exceptions";
import { DeleteEndpoint } from "../delete";
import type { Filters, Logger, O } from "../types";
import { buildPrimaryKeyFilters, buildWhereClause, getD1Binding, validateTableName } from "./base";

/**
 * D1-specific DeleteEndpoint implementation.
 * Provides automatic DELETE operations with SQL injection prevention.
 * Only allows deletion by primary key fields for safety.
 */
export class D1DeleteEndpoint<HandleArgs extends Array<object> = Array<object>> extends DeleteEndpoint<HandleArgs> {
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
   * Builds safe filters that only apply to primary keys.
   * This ensures that deletes can only target specific records by primary key.
   * @param filters - Filters object containing all filter conditions
   * @returns SafeFilters with validated conditions and parameters
   */
  protected getSafeFilters(filters: Filters) {
    return buildPrimaryKeyFilters(filters, this.meta.model.primaryKeys, this.getValidColumns());
  }

  /**
   * Fetches the existing object before deletion.
   * @param filters - Filter conditions for finding the object
   * @returns The existing record or null if not found
   */
  async getObject(filters: Filters): Promise<O<typeof this._meta> | null> {
    const tableName = validateTableName(this.meta.model.tableName);
    const safeFilters = this.getSafeFilters(filters);
    const whereClause = buildWhereClause(safeFilters.conditions);

    const sql = `SELECT * FROM ${tableName} ${whereClause} LIMIT 1`;

    if (this.logger) {
      this.logger.debug?.(`[D1DeleteEndpoint] getObject SQL: ${sql}`);
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
   * Deletes a record from the database.
   * @param oldObj - The existing record to delete
   * @param filters - Filter conditions for the deletion
   * @returns The deleted record or null if deletion failed
   * @throws ApiException on database errors
   */
  async delete(oldObj: O<typeof this._meta>, filters: Filters): Promise<O<typeof this._meta> | null> {
    const tableName = validateTableName(this.meta.model.tableName);
    const safeFilters = this.getSafeFilters(filters);
    const whereClause = buildWhereClause(safeFilters.conditions);

    const sql = `DELETE FROM ${tableName} ${whereClause} RETURNING *`;

    if (this.logger) {
      this.logger.debug?.(`[D1DeleteEndpoint] delete SQL: ${sql}`);
    }

    try {
      const result = await this.getDBBinding()
        .prepare(sql)
        .bind(...safeFilters.conditionsParams)
        .all();

      if (result.meta.changes === 0) {
        return null;
      }

      if (this.logger) {
        this.logger.log(`Successfully deleted record from ${tableName}`);
      }

      return oldObj;
    } catch (e: unknown) {
      const error = e as Error;
      if (this.logger) {
        this.logger.error(`Database error during delete ${tableName}: ${error.message}`);
      }
      // Sanitize error message - don't expose internal DB details
      throw new ApiException("Database operation failed");
    }
  }
}
