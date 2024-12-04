import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import type { EnumerationParameterType, ParameterType, RegexParameterType, RouteParameter } from "./types";
import { isSpecificZodType, legacyTypeIntoZod } from "./zod/utils";

extendZodWithOpenApi(z);
export function convertParams<M = z.ZodType>(field: any, params: any): M {
  params = params || {};
  if (params.required === false)
    // @ts-ignore
    field = field.optional();

  if (params.description) field = field.describe(params.description);

  if (params.default)
    // @ts-ignore
    field = field.default(params.default);

  if (params.example) {
    field = field.openapi({ example: params.example });
  }

  if (params.format) {
    field = field.openapi({ format: params.format });
  }

  return field;
}

export function Arr(innerType: any, params?: ParameterType): z.ZodArray<any> {
  return convertParams(legacyTypeIntoZod(innerType).array(), params);
}

export function Obj(fields: object, params?: ParameterType): z.ZodObject<any> {
  const parsed: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    parsed[key] = legacyTypeIntoZod(value);
  }

  return convertParams(z.object(parsed), params);
}

export function Num(params?: ParameterType): z.ZodNumber {
  return convertParams<z.ZodNumber>(z.number(), params).openapi({
    type: "number",
  });
}

export function Int(params?: ParameterType): z.ZodNumber {
  return convertParams<z.ZodNumber>(z.number().int(), params).openapi({
    type: "integer",
  });
}

export function Str(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string(), params);
}

export function DateTime(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(
    z.string().datetime({
      message: "Must be in the following format: YYYY-mm-ddTHH:MM:ssZ",
    }),
    params,
  );
}

export function Regex(params: RegexParameterType): z.ZodString {
  return convertParams<z.ZodString>(
    // @ts-ignore
    z
      .string()
      .regex(params.pattern, params.patternError || "Invalid"),
    params,
  );
}

export function Email(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().email(), params);
}

export function Uuid(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().uuid(), params);
}

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

export function Ipv4(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().ip({ version: "v4" }), params);
}

export function Ipv6(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().ip({ version: "v6" }), params);
}

export function Ip(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().ip(), params);
}

export function DateOnly(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.date(), params);
}

export function Bool(params?: ParameterType): z.ZodBoolean {
  return convertParams<z.ZodBoolean>(z.boolean(), params).openapi({
    type: "boolean",
  });
}

export function Enumeration(params: EnumerationParameterType): z.ZodEnum<any> {
  let { values } = params;
  const originalValues = { ...values };

  if (Array.isArray(values)) values = Object.fromEntries(values.map((x) => [x, x]));

  const originalKeys: [string, ...string[]] = Object.keys(values) as [string, ...string[]];

  if (params.enumCaseSensitive === false) {
    values = Object.keys(values).reduce((accumulator, key) => {
      // @ts-ignore
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

  // Keep retro compatibility
  //@ts-ignore
  result.values = originalValues;

  return result;
}

// This should only be used for query, params, headers and cookies
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
      // @ts-ignore
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
    if (schema && (schema as z.AnyZodObject).shape && (schema as z.AnyZodObject).shape[key]) {
      innerType = (schema as z.AnyZodObject).shape[key];
    } else if (schema) {
      // Fallback for Zod effects
      innerType = schema;
    }

    // Soft transform query strings into arrays
    if (innerType) {
      if (isSpecificZodType(innerType, "ZodArray") && !Array.isArray(params[key])) {
        params[key] = [params[key]];
      } else if (isSpecificZodType(innerType, "ZodBoolean")) {
        const _val = (params[key] as string).toLowerCase().trim();
        if (_val === "true" || _val === "false") {
          params[key] = _val === "true";
        }
      } else if (isSpecificZodType(innerType, "ZodNumber") || innerType instanceof z.ZodNumber) {
        params[key] = Number.parseFloat(params[key]);
      } else if (isSpecificZodType(innerType, "ZodBigInt") || innerType instanceof z.ZodBigInt) {
        params[key] = Number.parseInt(params[key]);
      } else if (isSpecificZodType(innerType, "ZodDate") || innerType instanceof z.ZodDate) {
        params[key] = new Date(params[key]);
      }
    }
  }

  return params;
}
