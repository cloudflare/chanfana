import { getReDocUI, getSwaggerUI } from './ui'
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
          if (handlers.length === 1 && handlers[0].schema?.paths !== undefined) {
            const nestedRouter = handlers[0]

            for (const [key, value] of Object.entries(nestedRouter.schema.paths)) {
              // @ts-ignore
              OpenAPIPaths[key] = value
            }
          } else if (prop !== 'all') {
            const parsedRoute = (options?.base || '') + route.replace(/:(\w+)/g, '{$1}')

            // @ts-ignore
            let schema: OpenAPISchema = undefined
            // @ts-ignore
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
                // @ts-ignore
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
          ...handlers.map((handler: any) => {
            if (handler.schema?.paths !== undefined) {
              return handler.handle
            }

            if (handler.isRoute) {
              return (...params: any[]) => new handler().execute(...params)
            }

            return handler
          })
        )
      }
    },
  })

  if (openapiConfig !== undefined) {
    if (options?.docs_url !== null && options?.openapi_url !== null) {
      router.get(options?.docs_url || '/docs', () => {
        return new Response(getSwaggerUI(options?.openapi_url || '/openapi.json'), {
          headers: {
            'content-type': 'text/html; charset=UTF-8',
          },
          status: 200,
        })
      })
    }

    if (options?.redoc_url !== null && options?.openapi_url !== null) {
      router.get(options?.redoc_url || '/redocs', () => {
        return new Response(getReDocUI(options?.openapi_url || '/openapi.json'), {
          headers: {
            'content-type': 'text/html; charset=UTF-8',
          },
          status: 200,
        })
      })
    }

    if (options?.openapi_url !== null) {
      router.get(options?.openapi_url || '/openapi.json', () => {
        return new Response(JSON.stringify(schema), {
          headers: {
            'content-type': 'application/json;charset=UTF-8',
          },
          status: 200,
        })
      })
    }

    if (options?.aiPlugin && options?.openapi_url !== null) {
      router.get('/.well-known/ai-plugin.json', () => {
        return new Response(JSON.stringify(options?.aiPlugin), {
          headers: {
            'content-type': 'application/json;charset=UTF-8',
          },
          status: 200,
        })
      })
    }
  }

  return routerProxy
}
