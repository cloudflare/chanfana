import { type AnyZodObject, z, type ZodEffects, ZodType } from 'zod'
import {
  type RouteConfig,
  type ZodMediaTypeObject,
} from '@asteasolutions/zod-to-openapi'
import {
  type HeadersObject as HeadersObject30,
  type LinksObject as LinksObject30,
  type OpenAPIObject,
} from 'openapi3-ts/oas30'
import {
  type HeadersObject as HeadersObject31,
  type LinksObject as LinksObject31,
} from 'openapi3-ts/oas31'

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}

// The following types are copied from @asteasolutions/zod-to-openapi as they are not exported
export type OpenAPIObjectConfig = Omit<
  OpenAPIObject,
  'paths' | 'components' | 'webhooks'
>
export type OpenAPIObjectConfigV31 = Omit<
  OpenAPIObject,
  'paths' | 'components' | 'webhooks'
>

type HeadersObject = HeadersObject30 | HeadersObject31
type LinksObject = LinksObject30 | LinksObject31

export type ZodMediaType =
  | 'application/json'
  | 'text/html'
  | 'text/plain'
  | 'application/xml'
  | (string & {})
export type ZodContentObject = Partial<Record<ZodMediaType, ZodMediaTypeObject>>
export interface ZodRequestBody {
  description?: string
  content: ZodContentObject
  required?: boolean
}
export interface ResponseConfig {
  description: string
  headers?: AnyZodObject | HeadersObject
  links?: LinksObject
  content?: ZodContentObject
}
export type RouteParameter =
  | AnyZodObject
  | ZodEffects<AnyZodObject, unknown, unknown>
  | undefined

export interface RouterOptions {
  base?: string
  schema?: Partial<OpenAPIObjectConfigV31 | OpenAPIObjectConfig>
  docs_url?: string | null
  redoc_url?: string | null
  openapi_url?: string | null
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
