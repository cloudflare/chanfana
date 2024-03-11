import { RouteEntry } from 'itty-router'
import { z, AnyZodObject, ZodType } from 'zod'
import {
  ResponseConfig,
  ZodMediaTypeObject,
} from '@asteasolutions/zod-to-openapi/dist/openapi-registry'
import { RouteConfig } from '@asteasolutions/zod-to-openapi'
import { OpenAPIObjectConfigV31 } from '@asteasolutions/zod-to-openapi/dist/v3.1/openapi-generator'
import { OpenAPIObjectConfig } from '@asteasolutions/zod-to-openapi/dist/v3.0/openapi-generator'
// @ts-ignore
import { HeadersObject as HeadersObject30 } from 'openapi3-ts/dist/model/openapi30'
// @ts-ignore
import { HeadersObject as HeadersObject31 } from 'openapi3-ts/dist/model/openapi31'

export interface RouterOptions {
  base?: string
  routes?: RouteEntry[]
  schema?: Partial<OpenAPIObjectConfigV31 | OpenAPIObjectConfig>
  docs_url?: string
  redoc_url?: string
  openapi_url?: string
  aiPlugin?: AIPlugin
  raiseUnknownParameters?: boolean
  generateOperationIds?: boolean
  openapiVersion?: '3' | '3.1'
  skipValidation?: boolean
  baseRouter?: any
}

export declare type RouteParameter<Z extends z.ZodType = z.ZodType> = {
  name?: string
  location: string
  type: Z
}

export declare type MediaTypeObject = Omit<ZodMediaTypeObject, 'schema'> & {
  schema: any // TODO enable type hint when legacy types drop the 'new'
}

export declare type ContentObject = {
  [mediaType: string]: MediaTypeObject
}

export declare type QueryParameter<Z extends z.ZodType = z.ZodType> =
  RouteParameter<Z> & { location: 'query' }
export declare type PathParameter<Z extends z.ZodType = z.ZodType> =
  RouteParameter<Z> & { location: 'params' }
export declare type HeaderParameter<Z extends z.ZodType = z.ZodType> =
  RouteParameter<Z> & { location: 'headers' }

export declare type RouteResponse = Omit<
  ResponseConfig,
  'headers' | 'content'
> & {
  headers?:
    | AnyZodObject
    | HeadersObject30
    | HeadersObject31
    | Record<string, any>
  schema?: Record<any, any>
  contentType?: string
  content?: ContentObject
}

export declare type OpenAPIRouteSchema = Omit<
  RouteConfig,
  'method' | 'path' | 'requestBody' | 'parameters' | 'responses'
> & {
  requestBody?: Record<string, any>
  parameters?: Record<string, RouteParameter> | RouteParameter[]
  responses?: {
    [statusCode: string]: RouteResponse
  }
}

export interface RouteOptions {
  raiseUnknownParameters: boolean
  skipValidation: boolean
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

export interface ParameterLocation extends StringParameterType {
  name?: string
  required?: boolean
  contentType?: string

  // Because this is a generic initializer, it must include all available options
  values?: Record<string, any>
  enumCaseSensitive?: boolean
  pattern?: string | RegExp
  patternError?: string
}

export interface RouteValidated {
  data: any
  errors?: Record<string, any>
}

export enum SchemaVersion {
  V1 = 'v1',
}

export enum AuthType {
  NONE = 'none',
  OAUTH = 'oauth',
  SERVICE_HTTP = 'service_http',
  USER_HTTP = 'user_http',
}

export enum APIType {
  OPENAPI = 'openapi',
}

export interface AIPlugin {
  schema_version?: SchemaVersion | string
  name_for_model: string
  name_for_human: string
  description_for_model: string
  description_for_human: string
  auth?: Auth
  api?: API
  logo_url: string
  contact_email: string
  legal_info_url: string
  is_dev?: boolean
}

export interface API {
  type: APIType | string
  url: string
  has_user_authentication: boolean
}

export interface Auth {
  type: AuthType | string
  authorization_type?: string
  authorization_url?: string
  client_url?: string
  scope?: string
  authorization_content_type?: string
  verification_tokens?: VerificationTokens
  instructions?: string
}

export interface VerificationTokens {
  openai: string
}

export type TypedParameter<Z extends z.ZodType> = Z &
  (new (params?: ParameterType) => Z)

export type InferredQueryParameter<T> =
  T extends QueryParameter<infer Z extends z.ZodType> ? z.infer<Z> : never
export type InferredPathParameter<T> =
  T extends PathParameter<infer Z extends z.ZodType> ? z.infer<Z> : never
export type InferredHeaderParameter<T> =
  T extends HeaderParameter<infer Z extends z.ZodType> ? z.infer<Z> : never

export type InferredData<P, B extends z.ZodType = z.ZodUndefined> = {
  headers: {
    [K in keyof P as P[K] extends HeaderParameter<infer Z extends z.ZodType>
      ? K
      : never]: InferredHeaderParameter<P[K]>
  }
  params: {
    [K in keyof P as P[K] extends PathParameter<infer Z extends z.ZodType>
      ? K
      : never]: InferredPathParameter<P[K]>
  }
  query: {
    [K in keyof P as P[K] extends QueryParameter<infer Z extends z.ZodType>
      ? K
      : never]: InferredQueryParameter<P[K]>
  }
  body: z.infer<B>
}
