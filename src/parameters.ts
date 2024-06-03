import {
  EnumerationParameterType,
  ParameterType,
  RegexParameterType,
} from './types'
import { z } from 'zod'
import { isSpecificZodType, legacyTypeIntoZod } from './zod/utils'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { RouteParameter } from '@asteasolutions/zod-to-openapi/dist/openapi-registry'

if (z.string().openapi === undefined) {
  // console.log('zod extension applied')
  extendZodWithOpenApi(z)
}

export function convertParams<M = z.ZodType>(field: any, params: any): M {
  params = params || {}
  if (params.required === false)
    // @ts-ignore
    field = field.optional()

  if (params.description) field = field.describe(params.description)

  if (params.default)
    // @ts-ignore
    field = field.default(params.default)

  if (params.example) {
    field = field.openapi({ example: params.example })
  }

  if (params.format) {
    field = field.openapi({ format: params.format })
  }

  return field
}

export function Arr(innerType: any, params?: ParameterType): z.ZodArray<any> {
  return convertParams(legacyTypeIntoZod(innerType).array(), params)
}

export function Obj(fields: object, params?: ParameterType): z.ZodObject<any> {
  const parsed: Record<string, any> = {}
  for (const [key, value] of Object.entries(fields)) {
    parsed[key] = legacyTypeIntoZod(value)
  }

  return convertParams(z.object(parsed), params)
}

export function Num(params?: ParameterType): z.ZodNumber {
  return convertParams<z.ZodNumber>(
    z.number().or(z.string()).pipe(z.coerce.number()),
    params
  ).openapi({
    type: 'number',
  })
}

export function Int(params?: ParameterType): z.ZodNumber {
  return convertParams<z.ZodNumber>(
    z.number().int().or(z.string()).pipe(z.coerce.number()),
    params
  ).openapi({
    type: 'integer',
  })
}

export function Str(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string(), params)
}

export function DateTime(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(
    z.string().datetime({
      message: 'Must be in the following format: YYYY-mm-ddTHH:MM:ssZ',
    }),
    params
  )
}

export function Regex(params: RegexParameterType): z.ZodString {
  return convertParams<z.ZodString>(
    // @ts-ignore
    z.string().regex(params.pattern, params.patternError || 'Invalid'),
    params
  )
}

export function Email(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().email(), params)
}

export function Uuid(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().uuid(), params)
}

export function Hostname(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(
    z
      .string()
      .regex(
        /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/
      ),
    params
  )
}

export function Ipv4(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(
    z.coerce.string().ip({ version: 'v4' }),
    params
  )
}

export function Ipv6(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().ip({ version: 'v6' }), params)
}

export function Ip(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.string().ip(), params)
}

export function DateOnly(params?: ParameterType): z.ZodString {
  return convertParams<z.ZodString>(z.coerce.date(), params)
}

export function Bool(params?: ParameterType): z.ZodBoolean {
  return convertParams<z.ZodBoolean>(
    z.coerce
      .string()
      .toLowerCase()
      .pipe(z.enum(['true', 'false']).transform((val) => val === 'true')),
    params
  ).openapi({
    type: 'boolean',
  })
}

export function Enumeration(params: EnumerationParameterType): z.ZodEnum<any> {
  let { values } = params
  const originalValues = { ...values }

  if (Array.isArray(values))
    values = Object.fromEntries(values.map((x) => [x, x]))

  const originalKeys: [string, ...string[]] = Object.keys(values) as [
    string,
    ...string[],
  ]

  if (params.enumCaseSensitive === false) {
    values = Object.keys(values).reduce((accumulator, key) => {
      // @ts-ignore
      accumulator[key.toLowerCase()] = values[key]
      return accumulator
    }, {})
  }

  const keys: [string, ...string[]] = Object.keys(values) as [
    string,
    ...string[],
  ]

  let field
  if ([undefined, true].includes(params.enumCaseSensitive)) {
    field = z.enum(keys)
  } else {
    field = z
      .preprocess((val) => String(val).toLowerCase(), z.enum(keys))
      .openapi({ enum: originalKeys })
  }

  field = field.transform((val) => values[val])

  const result = convertParams<z.ZodEnum<any>>(field, params)

  // Keep retro compatibility
  //@ts-ignore
  result.values = originalValues

  return result
}

export function extractParameter(
  request: Request,
  query: Record<string, any>,
  name: string,
  location: string
): any {
  if (location === 'query') {
    return query[name]
  }
  if (location === 'path') {
    // @ts-ignore
    return request.params[name]
  }
  if (location === 'header') {
    // @ts-ignore
    return request.headers.get(name)
  }
  if (location === 'cookie') {
    throw new Error('Cookie parameters not implemented yet')
  }
}

export function extractQueryParameters(
  request: Request,
  schema?: RouteParameter
): Record<string, any> | null {
  const { searchParams } = new URL(request.url)

  // For older node versions, searchParams is just an object without the size property
  if (
    searchParams.size === 0 ||
    (searchParams.size === undefined &&
      typeof searchParams === 'object' &&
      Object.keys(searchParams).length === 0)
  ) {
    return null
  }

  const params: Record<string, any> = {}
  for (let [key, value] of searchParams.entries()) {
    // Query parameters can be empty strings, that should equal to null as nothing was provided
    if (value === '') {
      // @ts-ignore
      value = null
    }

    if (params[key] === undefined) {
      params[key] = value
    } else if (!Array.isArray(params[key])) {
      params[key] = [params[key], value]
    } else {
      params[key].push(value)
    }

    // Soft transform query strings into arrays
    if (schema && schema.shape[key]) {
      if (
        isSpecificZodType(schema.shape[key], 'ZodArray') &&
        !Array.isArray(params[key])
      ) {
        params[key] = [params[key]]
      } else if (isSpecificZodType(schema.shape[key], 'ZodBoolean')) {
        // z.preprocess(
        // (val) => String(val).toLowerCase(),
        // z.enum(['true', 'false']).transform((val) => val === 'true')
        // ),
      }
    }
  }

  return params
}
