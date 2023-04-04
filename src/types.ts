import { RequestLike, Route, RouteEntry, RouterType } from 'itty-router'
import { Parameter } from './parameters'

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
}

export interface OpenAPISchema {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  requestBody?: Record<string, any>
  parameters?: Record<string, Parameter> | Parameter[]
  responses?: Record<string, ResponseSchema>
  deprecated?: boolean
}

export interface OpenAPIRouteSchema {
  getSchema(): OpenAPISchema
  schema: OpenAPISchema
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
  pattern: string
  patternError?: string
}

export interface ParameterLocation extends StringParameterType {
  name?: string
  required?: boolean
  contentType?: boolean

  // Because this is a generic initializer, it must include all available options
  values?: Record<string, any>
  enumCaseSensitive?: boolean
  pattern?: string
  patternError?: string
}

export interface ParameterBody {
  description?: string
  contentType?: string
}

export interface ResponseSchema {
  description?: string
  schema: Record<any, any>
}

export interface RouteValidated {
  data: Record<string, any>
  errors: Record<string, any>
}
