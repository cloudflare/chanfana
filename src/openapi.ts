import { getReDocUI, getSwaggerUI } from './ui'
import { Router, IRequest } from 'itty-router'
import { getFormatedParameters, Query } from './parameters'
import { OpenAPIRouterSchema, OpenAPISchema, RouterOptions, APIType, AuthType, SchemaVersion } from './types'

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
      const url = options?.openapi_url || '/openapi.json'
      const res = () => {
        const headers: HeadersInit =
          options?.aiPlugin?.is_dev === true
            ? {
                'content-type': 'application/json;charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
              }
            : {
                'content-type': 'application/json;charset=UTF-8',
              }
        return new Response(JSON.stringify(schema), {
          headers,
          status: 200,
        })
      }
      router.get(url, res)
      router.options(url, res)
    }

    if (options?.aiPlugin && options?.openapi_url !== null) {
      const res = (request: IRequest) => {
        const headers: HeadersInit =
          options?.aiPlugin?.is_dev === true
            ? {
                'content-type': 'application/json;charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
              }
            : {
                'content-type': 'application/json;charset=UTF-8',
              }
        const url =
          options?.aiPlugin?.is_dev === true
            ? `http://localhost:8787${options?.openapi_url || '/openapi.json'}`
            : `https://${request.headers.get('host')}${options?.openapi_url || '/openapi.json'}`
        return new Response(
          JSON.stringify({
            schema_version: SchemaVersion.V1,
            api: {
              type: APIType.OPENAPI,
              has_user_authentication: false,
              url,
            },
            auth: {
              type: AuthType.NONE,
            },
            ...options?.aiPlugin,
          }),
          {
            headers,
            status: 200,
          }
        )
      }
      router.get('/.well-known/ai-plugin.json', res)
      router.options('/.well-known/ai-plugin.json', res)
    }
  }

  return routerProxy
}
