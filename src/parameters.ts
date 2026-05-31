import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import type { AnyZodObject, RouteParameter } from "./types";

extendZodWithOpenApi(z);

type ParameterValue = string | number | boolean;

export interface ParameterType<Default = ParameterValue> {
  default?: Default;
  description?: string;
  example?: ParameterValue;
  required?: boolean;
  deprecated?: boolean;
  format?: string;
}

type NonWrappingParameterType<Default> = Omit<ParameterType<Default>, "default" | "required"> & {
  default?: never;
  required?: true;
};
type OptionalParameterType<Default> = Omit<ParameterType<Default>, "default" | "required"> & {
  default?: never;
  required: false;
};
type DefaultParameterType<Default> = Omit<ParameterType<Default>, "default" | "required"> & {
  default: Default;
  required?: true;
};
type OptionalDefaultParameterType<Default> = Omit<ParameterType<Default>, "default" | "required"> & {
  default: Default;
  required: false;
};
type ConvertedParameterSchema<M extends z.ZodType> =
  | M
  | z.ZodOptional<M>
  | z.ZodDefault<M>
  | z.ZodDefault<z.ZodOptional<M>>;
type ConvertedParameterSchemaForParams<M extends z.ZodType, Params> = [Params] extends [undefined]
  ? M
  : Params extends OptionalDefaultParameterType<any>
    ? z.ZodDefault<z.ZodOptional<M>>
    : Params extends DefaultParameterType<any>
      ? z.ZodDefault<M>
      : Params extends OptionalParameterType<any>
        ? z.ZodOptional<M>
        : Params extends NonWrappingParameterType<any>
          ? M
          : ConvertedParameterSchema<M>;

export function convertParams<M extends z.ZodType, Params extends ParameterType<any> | undefined = undefined>(
  field: M,
  params?: Params,
): ConvertedParameterSchemaForParams<M, Params> {
  if (!params) return field as ConvertedParameterSchemaForParams<M, Params>;

  let result: z.ZodType = field;

  if (params.required === false) result = result.optional();
  if (params.description) result = result.describe(params.description);
  if (params.default !== undefined) result = result.default(params.default);
  if (params.example !== undefined) result = result.openapi({ example: params.example });
  if (params.format) result = result.openapi({ format: params.format });
  if (params.deprecated !== undefined) result = result.openapi({ deprecated: params.deprecated });

  return result as ConvertedParameterSchemaForParams<M, Params>;
}

export function Arr<T extends z.ZodType, Params extends ParameterType<any> | undefined = undefined>(
  innerType: T,
  params?: Params,
): ConvertedParameterSchemaForParams<z.ZodArray<T>, Params> {
  return convertParams(innerType.array(), params);
}

export function Obj<T extends z.ZodRawShape, Params extends ParameterType<any> | undefined = undefined>(
  fields: T,
  params?: Params,
): ConvertedParameterSchemaForParams<z.ZodObject<T>, Params> {
  return convertParams(z.object(fields), params);
}

export function Str<Params extends ParameterType<any> | undefined = undefined>(
  params?: Params,
): ConvertedParameterSchemaForParams<z.ZodString, Params> {
  return convertParams(z.string(), params);
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
