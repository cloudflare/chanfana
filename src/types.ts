import { IRequest, RouteEntry } from 'itty-router'
import { z, AnyZodObject, ZodType } from 'zod'
import {
  ResponseConfig,
  ZodMediaTypeObject,
  ZodRequestBody,
} from '@asteasolutions/zod-to-openapi/dist/openapi-registry'
import { RouteConfig } from '@asteasolutions/zod-to-openapi'
import { OpenAPIObjectConfigV31 } from '@asteasolutions/zod-to-openapi/dist/v3.1/openapi-generator'
import { OpenAPIObjectConfig } from '@asteasolutions/zod-to-openapi/dist/v3.0/openapi-generator'
// @ts-ignore
import { HeadersObject as HeadersObject30 } from 'openapi3-ts/dist/model/openapi30'
// @ts-ignore
import { HeadersObject as HeadersObject31 } from 'openapi3-ts/dist/model/openapi31'
import { OpenAPIRoute } from './route'
import { OpenAPIRouterType } from './openapi'
import { Simplify } from 'type-fest'

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

export type ValidatedData<S extends OpenAPIRoute> = {
  query: GetPart<GetRequest<S>, 'query'>
  params: GetPart<GetRequest<S>, 'params'>
  headers: GetPart<GetRequest<S>, 'headers'>
  body: GetBody<GetPartBody<GetRequest<S>, 'body'>>
}

type GetRequest<T extends OpenAPIRoute> = NonNullable<T['schema']['request']>
type GetPart<T extends RequestTypes, P extends keyof T> =
  NonNullable<T[P]> extends AnyZodObject ? z.output<NonNullable<T[P]>> : never
type GetPartBody<T extends RequestTypes, P extends keyof T> =
  NonNullable<T[P]> extends AnyZodObject ? NonNullable<T[P]> : never

type GetBody<T extends ZodRequestBody> = NonNullable<
  T['content']['application/json']
>['schema'] extends AnyZodObject
  ? z.output<NonNullable<T['content']['application/json']>['schema']>
  : never
