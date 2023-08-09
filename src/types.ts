import { RouteEntry } from 'itty-router'
import { OpenAPIObject } from 'openapi3-ts/oas31'
import { AnyZodObject, ZodType } from 'zod'
import {
  ResponseConfig,
  ZodRequestBody,
} from '@asteasolutions/zod-to-openapi/dist/openapi-registry'
import { RouteConfig } from '@asteasolutions/zod-to-openapi'

export interface RouterOptions {
  base?: string
  routes?: RouteEntry[]
  schema?: Partial<OpenAPIObject>
  docs_url?: string
  redoc_url?: string
  openapi_url?: string
  aiPlugin?: AIPlugin
  raiseUnknownParameters?: boolean
  generateOperationIds?: boolean
  openapiVersion?: '3' | '3.1'
}

export declare type RouteParameter = {
  name?: string
  location: string
  type: ZodType
}

export declare type RouteResponse = Omit<ResponseConfig, 'content'> & {
  schema?: Record<any, any>
  contentType?: string
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
  errors: Record<string, any>
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
