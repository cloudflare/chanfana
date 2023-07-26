import { RequestLike, Route, RouteEntry, RouterType } from 'itty-router'

export interface ClassRoute {
  (path: string, ...handlers: OpenAPIRouteSchema[]): OpenAPIRouterSchema
}

export interface NestedRouter {
  (path: string, handlers: OpenAPIRouterSchema): OpenAPIRouterSchema
}

export type OpenAPIRouterSchema = {
  __proto__: RouterType
  routes: RouteEntry[]
  handle: (request: RequestLike, ...extra: any) => Promise<any>
  original: RouterType
  schema: any
} & {
  [any: string]: ClassRoute
} & {
  [any: string]: Route
} & {
  [any: string]: NestedRouter
}

export interface RouterOptions {
  base?: string
  routes?: RouteEntry[]
  schema?: Record<string, any>
  docs_url?: string
  redoc_url?: string
  openapi_url?: string
  aiPlugin?: AIPlugin
  raiseUnknownParameters?: boolean
  generateOperationIds?: boolean
  openapiVersion?: '3' | '3.1'
}

export interface RouteOptions {
  raiseUnknownParameters: boolean
}

export interface OpenAPISchema {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  requestBody?: Record<string, any>
  parameters?: Record<string, any>
  responses?: Record<string | number, ResponseSchema>
  deprecated?: boolean
}

export interface OpenAPIRouteSchema {
  getSchema(): OpenAPISchema

  schema: OpenAPISchema
}

export interface ResponseXML {
  name: string
}

export interface ParameterType {
  default?: string | number | boolean
  description?: string
  example?: string | number | boolean
  required?: boolean
  deprecated?: boolean
  xml?: ResponseXML
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

export interface ParameterBody {
  description?: string
  contentType?: string
}

export interface ResponseSchema {
  description: string
  schema?: Record<any, any>
  contentType?: string
}

export interface RouteValidated {
  data: Record<string, any>
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
