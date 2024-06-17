import { type AnyZodObject, z, ZodType } from 'zod'
import {
  type ResponseConfig,
  type ZodRequestBody,
} from '@asteasolutions/zod-to-openapi/dist/openapi-registry'
import { type RouteConfig } from '@asteasolutions/zod-to-openapi'
import { type OpenAPIObjectConfigV31 } from '@asteasolutions/zod-to-openapi/dist/v3.1/openapi-generator'
import { type OpenAPIObjectConfig } from '@asteasolutions/zod-to-openapi/dist/v3.0/openapi-generator'

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

export interface RouterOptions {
  base?: string
  schema?: Partial<OpenAPIObjectConfigV31 | OpenAPIObjectConfig>
  docs_url?: string
  redoc_url?: string
  openapi_url?: string
  raiseUnknownParameters?: boolean
  generateOperationIds?: boolean
  openapiVersion?: '3' | '3.1'
}

export interface RouteOptions {
  router: any
  raiseUnknownParameters: boolean
}

export interface ParameterType {
  default?: string | number | boolean
  description?: string
  example?: string | number | boolean
  required?: boolean
  deprecated?: boolean
}

export interface StringParameterType extends ParameterType {
  format?: string
}

export interface EnumerationParameterType extends StringParameterType {
  values: Record<string, any>
  enumCaseSensitive?: boolean
}

export interface RegexParameterType extends StringParameterType {
  pattern: RegExp
  patternError?: string
}

export type RequestTypes = {
  body?: ZodRequestBody
  params?: AnyZodObject
  query?: AnyZodObject
  cookies?: AnyZodObject
  headers?: AnyZodObject | ZodType<unknown>[]
}

// Changes over the original RouteConfig:
// - Make responses optional (a default one is generated)
// - Removes method and path (its inject on boot)
export type OpenAPIRouteSchema = Simplify<
  Omit<RouteConfig, 'responses' | 'method' | 'path' | 'request'> & {
    request?: RequestTypes
    responses?: {
      [statusCode: string]: ResponseConfig
    }
  }
>

export type ValidatedData<S> = S extends OpenAPIRouteSchema
  ? {
      query: GetRequest<S> extends NonNullable<GetRequest<S>>
        ? GetOutput<GetRequest<S>, 'query'>
        : undefined
      params: GetRequest<S> extends NonNullable<GetRequest<S>>
        ? GetOutput<GetRequest<S>, 'params'>
        : undefined
      headers: GetRequest<S> extends NonNullable<GetRequest<S>>
        ? GetOutput<GetRequest<S>, 'headers'>
        : undefined
      body: GetRequest<S> extends NonNullable<GetRequest<S>>
        ? GetBody<GetPartBody<GetRequest<S>, 'body'>>
        : undefined
    }
  : undefined

type GetRequest<T extends OpenAPIRouteSchema> = T['request']

type GetOutput<T extends object | undefined, P extends keyof T> =
  T extends NonNullable<T>
    ? T[P] extends AnyZodObject
      ? z.output<T[P]>
      : undefined
    : undefined

type GetPartBody<
  T extends RequestTypes,
  P extends keyof T,
> = T[P] extends ZodRequestBody ? T[P] : undefined

type GetBody<T extends ZodRequestBody | undefined> =
  T extends NonNullable<T>
    ? T['content']['application/json'] extends NonNullable<
        T['content']['application/json']
      >
      ? T['content']['application/json']['schema'] extends z.ZodTypeAny
        ? z.output<T['content']['application/json']['schema']>
        : undefined
      : undefined
    : undefined
