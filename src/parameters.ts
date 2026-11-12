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

/**
 * Unwraps optional/nullable/default wrappers and returns the array schema, if any.
 *
 * @param schema - The Zod schema to check
 * @returns The unwrapped ZodArray, or undefined when the schema is not an array
 */
function unwrapArray(schema: unknown): z.ZodArray | undefined {
  let current = schema;
  while (!(current instanceof z.ZodArray)) {
    if (!hasUnwrap(current)) {
      return undefined;
    }
    current = current.unwrap();
  }
  return current;
}

/**
 * Soft transforms a single string value into the type expected by the schema.
 * Values that are not strings, or that do not match a supported type, are returned unchanged.
 *
 * @param value - The raw value
 * @param innerType - The Zod schema to guide coercion
 * @returns The coerced value
 */
function coerceValue(value: unknown, innerType: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  if (unwrapAndCheck(innerType, z.ZodBoolean)) {
    const _val = value.toLowerCase().trim();
    if (_val === "true" || _val === "false") {
      return _val === "true";
    }
  } else if (unwrapAndCheck(innerType, z.ZodNumber)) {
    const numericValue = value.trim();
    return DECIMAL_NUMBER_PATTERN.test(numericValue) ? Number(numericValue) : Number.NaN;
  } else if (unwrapAndCheck(innerType, z.ZodBigInt)) {
    try {
      return BigInt(value);
    } catch {
      // If BigInt conversion fails, leave as string for Zod to handle validation
    }
  } else if (unwrapAndCheck(innerType, z.ZodDate)) {
    return new Date(value);
  }

  return value;
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
 * - Duplicate keys → arrays (items are coerced with the array element type)
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
  // oxlint-disable-next-line typescript/no-explicit-any -- public back-compat, callers read coerced values without narrowing
): Record<string, any> | null {
  // For older node versions, searchParams is just an object without the size property
  const size: unknown = Reflect.get(data, "size");
  if (size === 0 || (size === undefined && typeof data === "object" && Object.keys(data).length === 0)) {
    return null;
  }

  const shape: Record<string, unknown> | undefined = (schema as AnyZodObject | undefined)?.shape;
  const params: Record<string, unknown> = {};
  for (const [key, rawValue] of getEntries(data)) {
    let innerType: unknown;
    if (shape?.[key]) {
      innerType = shape[key];
    } else if (schema) {
      // Fallback for Zod effects
      innerType = schema;
    }
    const arrayType = innerType ? unwrapArray(innerType) : undefined;

    // Query, path and headers can be empty strings, that should equal to null as nothing was provided
    // Array items are coerced one by one with the element type, e.g. ?ids=1&ids=2 for z.number().array()
    const value = rawValue === "" ? null : arrayType ? coerceValue(rawValue, arrayType.element) : rawValue;

    const existing = params[key];
    if (existing === undefined) {
      params[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      params[key] = [existing, value];
    }

    const current = params[key];

    // Soft transform query strings into expected types
    if (innerType && current !== null) {
      if (arrayType) {
        if (!Array.isArray(current)) {
          params[key] = [current];
        }
      } else {
        params[key] = coerceValue(current, innerType);
      }
    }
  }

  return params;
}
