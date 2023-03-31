import { Request, Route, RouteEntry, Router } from 'itty-router'
import { Parameter } from './parameters'

export interface ClassRoute {
  (path: string, ...handlers: OpenAPIRouteSchema[]): OpenAPIRouterSchema
}

export type OpenAPIRouterSchema = {
  handle: (request: Request, ...extra: any) => Promise<any>
  routes: RouteEntry<Request>[]
  original: Router
} & {
  [any: string]: ClassRoute
} & {
  [any: string]: Route
}

export interface RouterOptions {
  base?: string
  routes?: RouteEntry<Request>[]
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
