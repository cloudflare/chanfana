import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import type {
  AnyZodObject,
  EnumerationParameterType,
  ParameterType,
  RegexParameterType,
  RouteParameter,
} from "./types";
import { legacyTypeIntoZod } from "./zod/utils";

extendZodWithOpenApi(z);

/**
 * Converts parameter options into Zod schema modifiers.
 * Applies optional, description, default, example, and format options.
 *
 * @param field - The Zod field to modify
 * @param params - Parameter options
 * @returns The modified Zod field
 */
export function convertParams<M = z.ZodType>(field: any, params: any): M {
  params = params || {};

  if (params.required === false) {
    field = field.optional();
  }

  if (params.description) {
    field = field.describe(params.description);
  }

  // Use explicit undefined check to support falsy defaults (0, false, "")
  if (params.default !== undefined) {
    field = field.default(params.default);
  }

  if (params.example !== undefined) {
    field = field.openapi({ example: params.example });
  }

  if (params.format) {
    field = field.openapi({ format: params.format });
  }

  return field;
}

/**
 * Creates a Zod array schema from any inner type.
 * @param innerType - The type for array elements
 * @param params - Optional parameter options
 */
export function Arr(innerType: any, params?: ParameterType): z.ZodArray<any> {
  return convertParams(legacyTypeIntoZod(innerType).array(), params);
}

/**
 * Creates a Zod object schema from a fields object.
 * @param fields - Object defining the schema fields
 * @param params - Optional parameter options
 */
export function Obj(fields: object, params?: ParameterType): z.ZodObject<any> {
  const parsed: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    parsed[key] = legacyTypeIntoZod(value);
  }

  return convertParams(z.object(parsed), params);
}

/**
 * Creates a Zod number schema.
 * @param params - Optional parameter options
 */
export function Num(params?: ParameterType): z.ZodNumber {
  return convertParams<z.ZodNumber>(z.number(), params).openapi({
    type: "number",
  });
}

/**
 * Creates a Zod integer schema.
 * @param params - Optional parameter options
 */
export function Int(params?: ParameterType): z.ZodNumber {
  return convertParams<z.ZodNumber>(z.number().int(), params).openapi({
    type: "integer",
  });
}

/**
 * Creates a Zod string schema.
 * @param params - Optional parameter options
 */
export function Str(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string(), params);
}

/**
 * Creates a Zod datetime schema (ISO 8601 format).
 * @param params - Optional parameter options
 */
export function DateTime(params?: ParameterType): z.ZodType {
  return convertParams(
    z.iso.datetime({
      error: "Must be in the following format: YYYY-mm-ddTHH:MM:ssZ",
    }),
    params,
  );
}

/**
 * Creates a Zod string schema with regex validation.
 * @param params - Parameter options including pattern and optional patternError
 */
export function Regex(params: RegexParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().regex(params.pattern, params.patternError || "Invalid"), params);
}

/**
 * Creates a Zod email schema.
 * @param params - Optional parameter options
 */
export function Email(params?: ParameterType): z.ZodType {
  return convertParams(z.email(), params);
}

/**
 * Creates a Zod UUID schema.
 * @param params - Optional parameter options
 */
export function Uuid(params?: ParameterType): z.ZodType {
  return convertParams(z.uuid(), params);
}

/**
 * Creates a Zod hostname schema using regex validation.
 * @param params - Optional parameter options
 */
export function Hostname(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(
    z
      .string()
      .regex(
        /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/,
      ),
    params,
  );
}

/**
 * Creates a Zod IPv4 address schema.
 * @param params - Optional parameter options
 */
export function Ipv4(params?: ParameterType): z.ZodType {
  return convertParams(z.ipv4(), params);
}

/**
 * Creates a Zod IPv6 address schema.
 * @param params - Optional parameter options
 */
export function Ipv6(params?: ParameterType): z.ZodType {
  return convertParams(z.ipv6(), params);
}

/**
 * Creates a Zod schema accepting either IPv4 or IPv6 addresses.
 * @param params - Optional parameter options
 */
export function Ip(params?: ParameterType): z.ZodType {
  return convertParams(z.union([z.ipv4(), z.ipv6()]), params);
}

/**
 * Creates a Zod date-only schema (YYYY-MM-DD format).
 * @param params - Optional parameter options
 */
export function DateOnly(params?: ParameterType): z.ZodType {
  return convertParams(z.iso.date(), params);
}

/**
 * Creates a Zod boolean schema.
 * @param params - Optional parameter options
 */
export function Bool(params?: ParameterType): z.ZodBoolean {
  return convertParams<z.ZodBoolean>(z.boolean(), params).openapi({
    type: "boolean",
  });
}

/**
 * Creates a Zod enum schema with optional case-insensitive matching.
 * @param params - Enumeration parameter options including values and enumCaseSensitive
 */
export function Enumeration(params: EnumerationParameterType): z.ZodEnum<any> {
  let { values } = params;
  const originalValues = { ...values };

  if (Array.isArray(values)) values = Object.fromEntries(values.map((x) => [x, x]));

  const originalKeys: [string, ...string[]] = Object.keys(values) as [string, ...string[]];

  if (params.enumCaseSensitive === false) {
    values = Object.keys(values).reduce((accumulator, key) => {
      // @ts-expect-error - dynamic key assignment
      accumulator[key.toLowerCase()] = values[key];
      return accumulator;
    }, {});
  }

  const keys: [string, ...string[]] = Object.keys(values) as [string, ...string[]];

  let field;
  if ([undefined, true].includes(params.enumCaseSensitive)) {
    field = z.enum(keys);
  } else {
    field = z.preprocess((val) => String(val).toLowerCase(), z.enum(keys)).openapi({ enum: originalKeys });
  }

  field = field.transform((val) => values[val]);

  const result = convertParams<z.ZodEnum<any>>(field, params);

  // Keep backward compatibility - attach values to result
  // @ts-expect-error - adding non-standard property for backward compatibility
  result.values = originalValues;

  return result;
}

/**
 * Helper function to unwrap optional/nullable types and check instanceof.
 * Handles Zod's wrapper types like ZodOptional, ZodNullable, ZodDefault.
 *
 * @param schema - The Zod schema to check
 * @param ZodClass - The Zod class to check against
 * @returns True if the unwrapped schema is an instance of ZodClass
 */
function unwrapAndCheck(schema: any, ZodClass: any): boolean {
  let current = schema;
  // Check first before unwrapping (important for arrays which also have .unwrap())
  if (current instanceof ZodClass) {
    return true;
  }
  // Unwrap optional/nullable/default wrappers
  while (current && typeof current.unwrap === "function") {
    current = current.unwrap();
    if (current instanceof ZodClass) {
      return true;
    }
  }
  return false;
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
export function coerceInputs(data: Record<string, any>, schema?: RouteParameter): Record<string, any> | null {
  // For older node versions, searchParams is just an object without the size property
  if (data.size === 0 || (data.size === undefined && typeof data === "object" && Object.keys(data).length === 0)) {
    return null;
  }

  const params: Record<string, any> = {};
  const entries = data.entries ? data.entries() : Object.entries(data);
  for (let [key, value] of entries) {
    // Query, path and headers can be empty strings, that should equal to null as nothing was provided
    if (value === "") {
      value = null;
    }

    if (params[key] === undefined) {
      params[key] = value;
    } else if (!Array.isArray(params[key])) {
      params[key] = [params[key], value];
    } else {
      params[key].push(value);
    }

    let innerType;
    if (schema && (schema as AnyZodObject).shape && (schema as AnyZodObject).shape[key]) {
      innerType = (schema as AnyZodObject).shape[key];
    } else if (schema) {
      // Fallback for Zod effects
      innerType = schema;
    }

    // Soft transform query strings into expected types
    if (innerType && params[key] !== null) {
      if (unwrapAndCheck(innerType, z.ZodArray) && !Array.isArray(params[key])) {
        params[key] = [params[key]];
      } else if (unwrapAndCheck(innerType, z.ZodBoolean) && typeof params[key] === "string") {
        const _val = params[key].toLowerCase().trim();
        if (_val === "true" || _val === "false") {
          params[key] = _val === "true";
        }
      } else if (unwrapAndCheck(innerType, z.ZodNumber) && typeof params[key] === "string") {
        params[key] = Number.parseFloat(params[key]);
      } else if (unwrapAndCheck(innerType, z.ZodBigInt) && typeof params[key] === "string") {
        try {
          params[key] = BigInt(params[key]);
        } catch {
          // If BigInt conversion fails, leave as string for Zod to handle validation
        }
      } else if (unwrapAndCheck(innerType, z.ZodDate) && typeof params[key] === "string") {
        params[key] = new Date(params[key]);
      }
    }
  }

  return params;
}
