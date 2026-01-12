import type { InputValidationException } from "../../exceptions";
import { CreateEndpoint } from "../create";
import type { Logger, O } from "../types";
import { getD1Binding, handleDbError, validateColumnName, validateTableName } from "./base";

/**
 * D1-specific CreateEndpoint implementation.
 * Provides automatic INSERT operations with SQL injection prevention.
 */
export class D1CreateEndpoint<HandleArgs extends Array<object> = Array<object>> extends CreateEndpoint<HandleArgs> {
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
   * Creates a new record in the database.
   * @param data - The validated data to insert
   * @returns The created record
   * @throws ApiException on database errors
   */
  async create(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
    const tableName = validateTableName(this.meta.model.tableName);
    const validColumns = this.getValidColumns();

    // Validate all column names from the data
    const columns = Object.keys(data).map((col) => validateColumnName(col, validColumns));
    const values = Object.values(data);

    // Build parameterized query
    const columnList = columns.join(", ");
    const placeholders = values.map((_, i) => `?${i + 1}`).join(", ");
    const sql = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders}) RETURNING *`;

    try {
      const result = await this.getDBBinding()
        .prepare(sql)
        .bind(...values)
        .all();

      const inserted = result.results[0] as O<typeof this._meta>;

      if (this.logger) {
        this.logger.log(`Successfully created record in ${tableName}`);
      }

      return inserted;
    } catch (e: unknown) {
      handleDbError(e as Error, this.constraintsMessages, this.logger, `create ${tableName}`);
    }
  }
}
