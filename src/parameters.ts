import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import type { AnyZodObject, RouteParameter } from "./types";

extendZodWithOpenApi(z);

const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

type ZodConstructor = abstract new (...args: never[]) => z.core.$ZodType;

function hasUnwrap(value: unknown): value is { unwrap: () => unknown } {
  return typeof value === "object" && value !== null && "unwrap" in value && typeof value.unwrap === "function";
}

/**
 * Helper function to unwrap optional/nullable types and check instanceof.
 * Handles Zod's wrapper types like ZodOptional, ZodNullable, ZodDefault.
 *
 * @param schema - The Zod schema to check
 * @param ZodClass - The Zod class to check against
 * @returns True if the unwrapped schema is an instance of ZodClass
 */
function unwrapAndCheck(schema: unknown, ZodClass: ZodConstructor): boolean {
  let current = schema;
  // Check first before unwrapping (important for arrays which also have .unwrap())
  if (current instanceof ZodClass) {
    return true;
  }
  // Unwrap optional/nullable/default wrappers
  while (hasUnwrap(current)) {
    current = current.unwrap();
    if (current instanceof ZodClass) {
      return true;
    }
  }
  return false;
}

function getEntries(data: object): Iterable<[string, unknown]> {
  if ("entries" in data && typeof data.entries === "function") {
    return data.entries() as Iterable<[string, unknown]>;
  }
  return Object.entries(data);
}

/**
 * Coerces input data to match expected Zod schema types.
 * Handles query strings, path params, headers, and cookies.
 *
 * Transformations:
 * - Empty strings → null
 * - Duplicate keys → arrays
 * - String "true"/"false" → boolean (for ZodBoolean)
 * - Numeric strings → numbers (for ZodNumber)
 * - Numeric strings → BigInt (for ZodBigInt)
 * - Date strings → Date objects (for ZodDate)
 *
 * @param data - The input data (URLSearchParams or plain object)
 * @param schema - Optional Zod schema to guide coercion
 * @returns Coerced data object or null if empty
 */
export function coerceInputs(
  data: URLSearchParams | object,
  schema?: RouteParameter,
  // biome-ignore lint/suspicious/noExplicitAny: public back-compat, callers read coerced values without narrowing
): Record<string, any> | null {
  // For older node versions, searchParams is just an object without the size property
  const size: unknown = Reflect.get(data, "size");
  if (size === 0 || (size === undefined && typeof data === "object" && Object.keys(data).length === 0)) {
    return null;
  }

  const shape: Record<string, unknown> | undefined = (schema as AnyZodObject | undefined)?.shape;
  const params: Record<string, unknown> = {};
  for (const [key, rawValue] of getEntries(data)) {
    // Query, path and headers can be empty strings, that should equal to null as nothing was provided
    const value = rawValue === "" ? null : rawValue;

    const existing = params[key];
    if (existing === undefined) {
      params[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      params[key] = [existing, value];
    }

    let innerType: unknown;
    if (shape?.[key]) {
      innerType = shape[key];
    } else if (schema) {
      // Fallback for Zod effects
      innerType = schema;
    }

    const current = params[key];

    // Soft transform query strings into expected types
    if (innerType && current !== null) {
      if (unwrapAndCheck(innerType, z.ZodArray) && !Array.isArray(current)) {
        params[key] = [current];
      } else if (unwrapAndCheck(innerType, z.ZodBoolean) && typeof current === "string") {
        const _val = current.toLowerCase().trim();
        if (_val === "true" || _val === "false") {
          params[key] = _val === "true";
        }
      } else if (unwrapAndCheck(innerType, z.ZodNumber) && typeof current === "string") {
        const numericValue = current.trim();
        params[key] = DECIMAL_NUMBER_PATTERN.test(numericValue) ? Number(numericValue) : Number.NaN;
      } else if (unwrapAndCheck(innerType, z.ZodBigInt) && typeof current === "string") {
        try {
          params[key] = BigInt(current);
        } catch {
          // If BigInt conversion fails, leave as string for Zod to handle validation
        }
      } else if (unwrapAndCheck(innerType, z.ZodDate) && typeof current === "string") {
        params[key] = new Date(current);
      }
    }
  }

  return params;
}
