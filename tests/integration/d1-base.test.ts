import { describe, expect, it } from "vitest";
import {
  ApiException,
  buildOrderByClause,
  buildPrimaryKeyFilters,
  buildSafeFilters,
  buildWhereClause,
  handleDbError,
  InputValidationException,
  validateColumnName,
  validateOrderByColumn,
  validateOrderDirection,
  validateSqlIdentifier,
  validateTableName,
} from "../../src";

describe("D1 Base Utilities", () => {
  describe("validateSqlIdentifier", () => {
    it("should accept valid identifiers", () => {
      expect(validateSqlIdentifier("users", "table")).toBe("users");
      expect(validateSqlIdentifier("user_name", "column")).toBe("user_name");
      expect(validateSqlIdentifier("_private", "column")).toBe("_private");
      expect(validateSqlIdentifier("Table123", "table")).toBe("Table123");
    });

    it("should reject empty string", () => {
      expect(() => validateSqlIdentifier("", "table")).toThrow(ApiException);
    });

    it("should reject identifiers starting with a number", () => {
      expect(() => validateSqlIdentifier("1table", "table")).toThrow(ApiException);
    });

    it("should reject SQL injection patterns", () => {
      expect(() => validateSqlIdentifier("DROP TABLE--", "table")).toThrow(ApiException);
      expect(() => validateSqlIdentifier("users; DROP TABLE", "table")).toThrow(ApiException);
      expect(() => validateSqlIdentifier("name = 'x' OR 1=1", "column")).toThrow(ApiException);
    });

    it("should reject identifiers with dots (schema-qualified names)", () => {
      expect(() => validateSqlIdentifier("schema.table", "table")).toThrow(ApiException);
    });

    it("should reject identifiers with special characters", () => {
      expect(() => validateSqlIdentifier("user-name", "column")).toThrow(ApiException);
      expect(() => validateSqlIdentifier("user name", "column")).toThrow(ApiException);
      expect(() => validateSqlIdentifier("user@name", "column")).toThrow(ApiException);
    });

    it("should reject identifiers exceeding 128 characters", () => {
      const longName = "a".repeat(129);
      expect(() => validateSqlIdentifier(longName, "table")).toThrow(ApiException);
    });

    it("should accept identifiers at exactly 128 characters", () => {
      const name = "a".repeat(128);
      expect(validateSqlIdentifier(name, "table")).toBe(name);
    });
  });

  describe("validateTableName", () => {
    it("should accept valid table names", () => {
      expect(validateTableName("users")).toBe("users");
      expect(validateTableName("user_posts")).toBe("user_posts");
    });

    it("should reject invalid table names", () => {
      expect(() => validateTableName("invalid-table")).toThrow(ApiException);
    });
  });

  describe("validateColumnName", () => {
    it("should accept valid column names without allowlist", () => {
      expect(validateColumnName("email")).toBe("email");
    });

    it("should accept column names in the allowlist", () => {
      expect(validateColumnName("email", ["id", "email", "name"])).toBe("email");
    });

    it("should reject column names not in the allowlist", () => {
      expect(() => validateColumnName("password", ["id", "email", "name"])).toThrow(ApiException);
    });

    it("should still validate format even without allowlist", () => {
      expect(() => validateColumnName("bad-col")).toThrow(ApiException);
    });
  });

  describe("validateOrderDirection", () => {
    it("should accept and normalize valid directions", () => {
      expect(validateOrderDirection("asc")).toBe("asc");
      expect(validateOrderDirection("desc")).toBe("desc");
      expect(validateOrderDirection("ASC")).toBe("asc");
      expect(validateOrderDirection("DESC")).toBe("desc");
      expect(validateOrderDirection("Asc")).toBe("asc");
    });

    it("should default to asc for undefined", () => {
      expect(validateOrderDirection(undefined)).toBe("asc");
    });

    it("should default to asc for invalid values", () => {
      expect(validateOrderDirection("invalid")).toBe("asc");
      expect(validateOrderDirection("")).toBe("asc");
    });
  });

  describe("validateOrderByColumn", () => {
    it("should return column when in allowed list", () => {
      expect(validateOrderByColumn("name", ["id", "name", "email"], "id")).toBe("name");
    });

    it("should fall back to fallback column when not in allowed list", () => {
      expect(validateOrderByColumn("password", ["id", "name", "email"], "id")).toBe("id");
    });

    it("should fall back for undefined column", () => {
      expect(validateOrderByColumn(undefined, ["id", "name"], "id")).toBe("id");
    });

    it("should fall back for 'undefined' string", () => {
      expect(validateOrderByColumn("undefined", ["id", "name"], "id")).toBe("id");
    });
  });

  describe("buildSafeFilters", () => {
    it("should build conditions for EQ operator", () => {
      const filters = [
        { field: "status", operator: "EQ", value: "active" },
        { field: "role", operator: "EQ", value: "admin" },
      ];
      const result = buildSafeFilters(filters, ["status", "role", "name"]);

      expect(result.conditions).toEqual(["status = ?1", "role = ?2"]);
      expect(result.conditionsParams).toEqual(["active", "admin"]);
    });

    it("should return empty arrays for no filters", () => {
      const result = buildSafeFilters([], ["id", "name"]);

      expect(result.conditions).toEqual([]);
      expect(result.conditionsParams).toEqual([]);
    });

    it("should respect startParamIndex", () => {
      const filters = [{ field: "name", operator: "EQ", value: "Alice" }];
      const result = buildSafeFilters(filters, ["name"], 5);

      expect(result.conditions).toEqual(["name = ?5"]);
    });

    it("should reject unsupported operators", () => {
      const filters = [{ field: "name", operator: "LIKE", value: "test" }];
      expect(() => buildSafeFilters(filters, ["name"])).toThrow(ApiException);
    });

    it("should reject invalid column names", () => {
      const filters = [{ field: "bad-col", operator: "EQ", value: "test" }];
      expect(() => buildSafeFilters(filters, ["id", "name"])).toThrow(ApiException);
    });
  });

  describe("buildPrimaryKeyFilters", () => {
    it("should filter to only primary key fields", () => {
      const filters = {
        filters: [
          { field: "id", operator: "EQ", value: 1 },
          { field: "name", operator: "EQ", value: "Alice" },
        ],
        options: {},
      };
      const result = buildPrimaryKeyFilters(filters, ["id"], ["id", "name"]);

      expect(result.conditions).toEqual(["id = ?1"]);
      expect(result.conditionsParams).toEqual([1]);
    });

    it("should throw when no primary key filters match", () => {
      const filters = {
        filters: [{ field: "name", operator: "EQ", value: "Alice" }],
        options: {},
      };
      expect(() => buildPrimaryKeyFilters(filters, ["id"], ["id", "name"])).toThrow("No primary key filters provided");
    });

    it("should handle composite primary keys", () => {
      const filters = {
        filters: [
          { field: "userId", operator: "EQ", value: 1 },
          { field: "postId", operator: "EQ", value: 2 },
          { field: "title", operator: "EQ", value: "test" },
        ],
        options: {},
      };
      const result = buildPrimaryKeyFilters(filters, ["userId", "postId"], ["userId", "postId", "title"]);

      expect(result.conditions).toHaveLength(2);
      expect(result.conditionsParams).toEqual([1, 2]);
    });
  });

  describe("handleDbError", () => {
    it("should throw sanitized error for generic errors", () => {
      const error = new Error("some internal error");
      expect(() => handleDbError(error, {})).toThrow("Database operation failed");
    });

    it("should map UNIQUE constraint to custom exception", () => {
      const error = new Error("UNIQUE constraint failed: users.email");
      const constraintsMessages = {
        "users.email": new InputValidationException("Email already exists", ["body", "email"]),
      };

      try {
        handleDbError(error, constraintsMessages);
        expect.fail("Should have thrown");
      } catch (e: any) {
        expect(e).toBeInstanceOf(InputValidationException);
        expect(e.message).toBe("Email already exists");
        expect(e.path).toEqual(["body", "email"]);
      }
    });

    it("should clone exception instances (not share references)", () => {
      const error = new Error("UNIQUE constraint failed: users.email");
      const template = new InputValidationException("Email taken", ["body", "email"]);
      const constraintsMessages = { "users.email": template };

      try {
        handleDbError(error, constraintsMessages);
        expect.fail("Should have thrown");
      } catch (e: any) {
        // Should be a new instance, not the same reference
        expect(e).not.toBe(template);
        expect(e.message).toBe("Email taken");
        expect(e.path).toEqual(["body", "email"]);
      }
    });

    it("should fall through to generic error when constraint not in map", () => {
      const error = new Error("UNIQUE constraint failed: users.username");
      const constraintsMessages = {
        "users.email": new InputValidationException("Email taken", ["body", "email"]),
      };

      expect(() => handleDbError(error, constraintsMessages)).toThrow("Database operation failed");
    });

    it("should call logger when provided", () => {
      const logged: string[] = [];
      const logger = {
        error: (...args: any[]) => {
          logged.push(args.join(" "));
        },
        log: () => {},
        info: () => {},
        warn: () => {},
        debug: () => {},
        trace: () => {},
      };
      const error = new Error("test error");

      expect(() => handleDbError(error, {}, logger, "create")).toThrow("Database operation failed");
      expect(logged).toHaveLength(1);
      expect(logged[0]).toContain("test error");
      expect(logged[0]).toContain("create");
    });
  });

  describe("buildWhereClause", () => {
    it("should build WHERE clause from conditions", () => {
      expect(buildWhereClause(["id = ?1", "name = ?2"])).toBe("WHERE id = ?1 AND name = ?2");
    });

    it("should return empty string for no conditions", () => {
      expect(buildWhereClause([])).toBe("");
    });

    it("should handle single condition", () => {
      expect(buildWhereClause(["id = ?1"])).toBe("WHERE id = ?1");
    });
  });

  describe("buildOrderByClause", () => {
    it("should build ORDER BY clause", () => {
      expect(buildOrderByClause("name", "asc")).toBe("ORDER BY name asc");
      expect(buildOrderByClause("id", "desc")).toBe("ORDER BY id desc");
    });
  });
});
