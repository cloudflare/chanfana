import { ReDocUI, SwaggerUI } from './ui'
import { Router } from 'itty-router'
import { getFormatedParameters, Query } from './parameters'
import { OpenAPIRouterSchema, OpenAPISchema, RouterOptions } from './types'

export function OpenAPIRouter(options?: RouterOptions): OpenAPIRouterSchema {
  const OpenAPIPaths: Record<string, Record<string, any>> = {}

  const router = Router({ base: options?.base, routes: options?.routes })

  const openapiConfig = {
    openapi: '3.0.2',
    info: {
      title: options?.schema?.info?.title || 'OpenAPI',
      version: options?.schema?.info?.version || '1.0',
    },
    ...options?.schema,
  }

  const schema = {
    ...openapiConfig,
    paths: OpenAPIPaths,
  }

  // @ts-ignore
  const routerProxy: OpenAPIRouter = new Proxy(router, {
    get: (target, prop, receiver) => {
      if (prop === 'original') {
        return router
      }
      if (prop === 'schema') {
        return schema
      }

      return (route: string, ...handlers: any) => {
        if (prop !== 'handle') {
          if (prop !== 'all') {
            const parsedRoute = (options?.base || '') + route.replace(/:(\w+)/g, '{$1}')

            let schema: OpenAPISchema = undefined
            let operationId: string = undefined

            for (const handler of handlers) {
              if (handler.name) {
                operationId = `${prop.toString()}_${handler.name}`
              }

              if (handler.getParsedSchema) {
                schema = handler.getParsedSchema()
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

  if (openapiConfig !== undefined) {
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
      return new Response(JSON.stringify(schema), {
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
        status: 200,
      })
    })
  }

  return routerProxy
}
