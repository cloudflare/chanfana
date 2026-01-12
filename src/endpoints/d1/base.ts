import { ApiException, type InputValidationException } from "../../exceptions";
import type { FilterCondition, Filters, Logger } from "../types";

/**
 * SQL identifier validation regex.
 * Allows alphanumeric characters, underscores, and must start with a letter or underscore.
 */
const SQL_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Valid ORDER BY direction values
 */
const VALID_ORDER_DIRECTIONS = new Set(["ASC", "DESC"]);

/**
 * Base configuration and utilities for D1 database endpoints.
 * Provides SQL injection prevention, DB binding management, and common query building utilities.
 */
export interface D1EndpointConfig {
  /** Name of the D1 database binding in the worker environment. Defaults to "DB" */
  dbName: string;
  /** Optional logger for debugging and error tracking */
  logger?: Logger;
  /** Custom error messages for UNIQUE constraint violations. Keys are constraint names (e.g., "users.email") */
  constraintsMessages: Record<string, InputValidationException>;
}

/**
 * Result from getSafeFilters - contains validated SQL conditions and parameters
 */
export interface SafeFilters {
  /** Array of SQL condition strings (e.g., ["id = ?1", "name = ?2"]) */
  conditions: string[];
  /** Array of parameter values to bind to the prepared statement */
  conditionsParams: (string | number | boolean | null)[];
}

/**
 * Validates that a string is a safe SQL identifier (table name, column name).
 * Prevents SQL injection by only allowing alphanumeric characters and underscores.
 *
 * @param identifier - The identifier to validate
 * @param type - Type of identifier for error message (e.g., "table", "column")
 * @returns The validated identifier
 * @throws ApiException if the identifier is invalid
 */
export function validateSqlIdentifier(identifier: string, type: string): string {
  if (!identifier || typeof identifier !== "string") {
    throw new ApiException(`Invalid ${type} name: must be a non-empty string`);
  }

  if (!SQL_IDENTIFIER_REGEX.test(identifier)) {
    throw new ApiException(
      `Invalid ${type} name "${identifier}": must start with a letter or underscore and contain only alphanumeric characters and underscores`,
    );
  }

  // Additional length check to prevent excessively long identifiers
  if (identifier.length > 128) {
    throw new ApiException(`Invalid ${type} name "${identifier}": exceeds maximum length of 128 characters`);
  }

  return identifier;
}

/**
 * Validates a table name for safe use in SQL queries.
 *
 * @param tableName - The table name to validate
 * @returns The validated table name
 * @throws ApiException if the table name is invalid
 */
export function validateTableName(tableName: string): string {
  return validateSqlIdentifier(tableName, "table");
}

/**
 * Validates a column name for safe use in SQL queries.
 *
 * @param columnName - The column name to validate
 * @param validColumns - Optional array of valid column names to check against
 * @returns The validated column name
 * @throws ApiException if the column name is invalid or not in the valid list
 */
export function validateColumnName(columnName: string, validColumns?: string[]): string {
  const validated = validateSqlIdentifier(columnName, "column");

  if (validColumns && validColumns.length > 0 && !validColumns.includes(validated)) {
    throw new ApiException(`Invalid column name "${columnName}": not found in schema`);
  }

  return validated;
}

/**
 * Validates and normalizes an ORDER BY direction.
 *
 * @param direction - The direction string to validate
 * @returns "ASC" or "DESC"
 */
export function validateOrderDirection(direction: string | undefined): "ASC" | "DESC" {
  const normalized = (direction || "ASC").toUpperCase().trim();
  return VALID_ORDER_DIRECTIONS.has(normalized) ? (normalized as "ASC" | "DESC") : "ASC";
}

/**
 * Validates an ORDER BY column against a whitelist of allowed columns.
 *
 * @param column - The column name to order by
 * @param allowedColumns - Array of columns that are allowed for ordering
 * @param fallbackColumn - Column to use if the provided column is not allowed
 * @returns The validated column name or fallback
 */
export function validateOrderByColumn(
  column: string | undefined,
  allowedColumns: string[],
  fallbackColumn: string,
): string {
  if (!column || typeof column !== "string" || column === "undefined") {
    return validateColumnName(fallbackColumn);
  }

  // Check if column is in the allowed list
  if (allowedColumns.includes(column)) {
    return validateColumnName(column);
  }

  // Fall back to default
  return validateColumnName(fallbackColumn);
}

/**
 * Builds safe SQL filter conditions from an array of filter conditions.
 * Validates all column names against the provided schema columns.
 *
 * @param filters - Array of filter conditions
 * @param validColumns - Array of valid column names from the schema
 * @param startParamIndex - Starting index for parameter placeholders (default: 1)
 * @returns SafeFilters object with conditions and parameters
 * @throws ApiException if any column name is invalid or operator is not supported
 */
export function buildSafeFilters(filters: FilterCondition[], validColumns: string[], startParamIndex = 1): SafeFilters {
  const conditions: string[] = [];
  const conditionsParams: (string | number | boolean | null)[] = [];

  for (const f of filters) {
    const validatedColumn = validateColumnName(f.field, validColumns);

    if (f.operator === "EQ") {
      conditions.push(`${validatedColumn} = ?${startParamIndex + conditionsParams.length}`);
      conditionsParams.push(f.value);
    } else {
      throw new ApiException(`Operator "${f.operator}" is not implemented`);
    }
  }

  return { conditions, conditionsParams };
}

/**
 * Builds safe SQL filter conditions for primary key lookups only.
 * Filters out any conditions that are not on primary key columns.
 *
 * @param filters - Filters object containing filter conditions
 * @param primaryKeys - Array of primary key column names
 * @param validColumns - Array of valid column names from the schema
 * @param startParamIndex - Starting index for parameter placeholders (default: 1)
 * @returns SafeFilters object with conditions and parameters
 */
export function buildPrimaryKeyFilters(
  filters: Filters,
  primaryKeys: string[],
  validColumns: string[],
  startParamIndex = 1,
): SafeFilters {
  // Filter to only include primary key fields
  const primaryKeyFilters = filters.filters.filter((f) => primaryKeys.includes(f.field));

  return buildSafeFilters(primaryKeyFilters, validColumns, startParamIndex);
}

/**
 * Gets a D1 database binding from the worker environment.
 *
 * @param getBindings - Function to get bindings from router args
 * @param args - Handler arguments
 * @param dbName - Name of the D1 binding
 * @returns D1Database instance
 * @throws ApiException if binding is not defined or is not a D1 binding
 */
export function getD1Binding(
  getBindings: (args: any[]) => Record<string, any>,
  args: any[],
  dbName: string,
): D1Database {
  const env = getBindings(args);

  if (env[dbName] === undefined) {
    throw new ApiException(`Binding "${dbName}" is not defined in worker`);
  }

  if (env[dbName].prepare === undefined) {
    throw new ApiException(`Binding "${dbName}" is not a D1 binding`);
  }

  return env[dbName];
}

/**
 * Handles database errors and maps UNIQUE constraint violations to custom exceptions.
 *
 * @param error - The caught error
 * @param constraintsMessages - Map of constraint names to custom exceptions
 * @param logger - Optional logger for error tracking
 * @param operation - Description of the operation for logging
 * @throws The mapped InputValidationException or a sanitized ApiException
 */
export function handleDbError(
  error: Error,
  constraintsMessages: Record<string, InputValidationException>,
  logger?: Logger,
  operation?: string,
): never {
  if (logger && operation) {
    logger.error(`Database error during ${operation}: ${error.message}`);
  }

  // Handle UNIQUE constraint violations with custom messages
  if (error.message.includes("UNIQUE constraint failed")) {
    const match = error.message.match(/UNIQUE constraint failed:\s*([^:]+)/);
    if (match?.[1]) {
      const constraintName = match[1].trim();
      if (constraintsMessages[constraintName]) {
        throw constraintsMessages[constraintName];
      }
    }
  }

  // Sanitize error message - don't expose internal DB details
  throw new ApiException("Database operation failed");
}

/**
 * Builds a safe WHERE clause from conditions array.
 *
 * @param conditions - Array of condition strings
 * @returns WHERE clause string or empty string if no conditions
 */
export function buildWhereClause(conditions: string[]): string {
  if (conditions.length === 0) {
    return "";
  }
  return `WHERE ${conditions.join(" AND ")}`;
}

/**
 * Builds a safe ORDER BY clause.
 *
 * @param column - Validated column name
 * @param direction - Validated direction ("ASC" or "DESC")
 * @returns ORDER BY clause string
 */
export function buildOrderByClause(column: string, direction: "ASC" | "DESC"): string {
  return `ORDER BY ${column} ${direction}`;
}
