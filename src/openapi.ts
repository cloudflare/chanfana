import { ReDocUI, SwaggerUI } from './interface'
import { Request, Route, RouteEntry, Router } from 'itty-router'
import { extractParameter, extractQueryParameters, Parameter, Query } from './parameters'
import { ApiException, InputValidationException } from './exceptions'

export interface ClassRoute {
  (path: string, ...handlers: OpenAPIRouteSchema[]): OpenAPIRouter
}

export type OpenAPIRouter = {
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
  config?: Record<string, any>
}

export function OpenAPIRouter(options?: RouterOptions): OpenAPIRouter {
  const OpenAPIPaths: Record<string, Record<string, any>> = {}

  const router = Router({ base: options.base, routes: options.routes })

  // @ts-ignore
  const routerProxy: OpenAPIRouter = new Proxy(router, {
    get: (target, prop, receiver) => {
      if (prop === 'original') {
        return router
      }

      return (route: string, ...handlers: any) => {
        if (prop !== 'handle') {
          if (prop !== 'all') {
            const parsedRoute = route.replace(/:(\w+)/g, '{$1}')

            let schema: OpenAPISchema = undefined
            let operationId: string = undefined

            for (const handler of handlers) {
              if (handler.name) {
                operationId = `${prop.toString()}_${handler.name}`
              }

              if (handler.schema) {
                schema = handler.getSchema()
                break
              }
            }

            if (OpenAPIPaths[parsedRoute] === undefined) {
              // The same path can have multiple operations
              OpenAPIPaths[parsedRoute] = {}
            }

            if (operationId === undefined) {
              operationId = `${prop.toString()}_${route.replaceAll('/', '_')}`
            }

            if (schema === undefined) {
              // No schema for this route, try to guest the parameters
              const params = route.match(/:(\w+)/g)

              schema = {
                operationId: operationId,
                parameters: params
                  ? getFormatedParameters(
                      params.map((param) => {
                        return Query(String, {
                          name: param.replace(':', ''),
                        })
                      })
                    )
                  : null,
              }
            }

            OpenAPIPaths[parsedRoute][prop.toString()] = { operationId, ...schema }
          }
        }

        return Reflect.get(
          target,
          prop,
          receiver
        )(
          route,
          ...handlers.map((handler) => {
            if (handler.isRoute === true) {
              return (...params) => new handler().execute(...params)
            }

            return handler
          })
        )
      }
    },
  })

  if (options?.config !== undefined) {
    router.get('/docs', () => {
      return new Response(SwaggerUI, {
        headers: {
          'content-type': 'text/html; charset=UTF-8',
        },
        status: 200,
      })
    })
    router.get('/redocs', () => {
      return new Response(ReDocUI, {
        headers: {
          'content-type': 'text/html; charset=UTF-8',
        },
        status: 200,
      })
    })
    router.get('/openapi.json', () => {
      return new Response(
        JSON.stringify({
          ...options?.config,
          paths: OpenAPIPaths,
        }),
        {
          headers: {
            'content-type': 'application/json;charset=UTF-8',
          },
          status: 200,
        }
      )
    })
  }

  return routerProxy
}

export function route(options, func) {
  func.schema = options

  return func
}

interface OpenAPISchema {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  requestBody?: any
  parameters?: Record<string, Parameter> | Parameter[]
  responses?: any
}

interface OpenAPIRouteSchema {
  getSchema()
}

export class OpenAPIRoute implements OpenAPIRouteSchema {
  static isRoute = true
  static schema: OpenAPISchema

  static getSchema() {
    // Easy deep copy
    const config = {
      parameters: {},
      ...this.schema,
    }

    config.parameters = getFormatedParameters(config.parameters)

    return config
  }

  getSchema() {
    // @ts-ignore
    return this.__proto__.constructor.getSchema()
  }

  get schema() {
    // @ts-ignore
    return this.__proto__.constructor.schema
  }

  async execute(request, ...args) {
    const { data, errors } = this.validateRequest(request)

    if (errors.length > 0) {
      throw new InputValidationException(errors)
    }

    args['data'] = data

    return await this.handle(request, ...args)
  }

  validateRequest(request: Request): any {
    // TODO: check parameters in the static getSchema are not validated here
    const params = this.schema.parameters || {}
    const queryParams = extractQueryParameters(request)

    const validatedObj = {}
    const validationErrors = []

    for (const [key, value] of Object.entries(params)) {
      // @ts-ignore
      const param: Parameter = value
      const name = param.params.name ? param.params.name : key
      const rawData = extractParameter(request, queryParams, name, param.location)

      try {
        const data = param.validate(rawData)
        validatedObj[name] = data
      } catch (e) {
        validationErrors.push(`${name} ${(e as ApiException).message}`)
      }
    }
    // console.log(validatedObj)
    // console.log(validationErrors)

    return {
      data: validatedObj,
      errors: validationErrors,
    }
  }

  handle(request, ...args): Promise<Response> {
    throw new Error('Method not implemented.')
  }
}

export function getFormatedParameters(params: Record<string, Parameter> | Parameter[]) {
  const formated = []
  const isArray = Array.isArray(params)

  for (const [key, parameter] of Object.entries(params || {})) {
    if (isArray && !parameter.params.name) {
      throw new Error('Parameter must have a defined name when using as Array')
    }

    const name = parameter.params.name ? parameter.params.name : key

    formated.push({
      // TODO: check this type before assign
      // @ts-ignore
      ...parameter.getValue(),
      name: name,
    })
  }

  return formated
}
