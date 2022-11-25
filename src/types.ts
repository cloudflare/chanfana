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
}

export interface OpenAPISchema {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  requestBody?: Record<string, any>
  parameters?: Record<string, Parameter> | Parameter[]
  responses?: Record<string, ResponseSchema>
}

export interface OpenAPIRouteSchema {
  getSchema(): OpenAPISchema
  schema: OpenAPISchema
}

export interface ParameterType {
  default?: string | number | boolean
  description?: string
  example?: string | number | boolean
  enum?: Record<string, any>
  enumCaseSensitive?: boolean
  required?: boolean
}

export interface StringParameterType extends ParameterType {
  format?: string
}

export interface ParameterLocation extends ParameterType {
  name?: string
  required?: boolean
  contentType?: boolean
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
