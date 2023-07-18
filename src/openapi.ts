import { getReDocUI, getSwaggerUI } from './ui'
import { IRequest, Router } from 'itty-router'
import {
  APIType,
  AuthType,
  OpenAPIRouterSchema,
  RouterOptions,
  SchemaVersion,
} from './types'
import {
  OpenApiGeneratorV31,
  OpenApiGeneratorV3,
  RouteConfig,
} from '@asteasolutions/zod-to-openapi'
import { OpenAPIRegistryMerger } from './zod/registry'
import { z } from 'zod'

export function OpenAPIRouter(options?: RouterOptions): OpenAPIRouterSchema {
  const registry = new OpenAPIRegistryMerger()

  const getGeneratedSchema = () => {
    let openapiGenerator: any = OpenApiGeneratorV31
    if (options?.openapiVersion === '3') openapiGenerator = OpenApiGeneratorV3

    // console.log(router.routes)
    const generator = new openapiGenerator(registry.definitions)

    return generator.generateDocument({
      openapi: options?.openapiVersion === '3' ? '3.0.3' : '3.1.0',
      info: {
        version: options?.schema?.info?.version || '1.0.0',
        title: options?.schema?.info?.title || 'OpenAPI',
        description: options?.schema?.info?.description,
      },
      servers: options?.schema?.servers,
    })
  }

  const router = Router({ base: options?.base, routes: options?.routes })

  // const openapiConfig = {
  //   openapi: '3.0.2',
  //   info: {
  //     title: options?.schema?.info?.title || 'OpenAPI',
  //     version: options?.schema?.info?.version || '1.0',
  //   },
  //   raiseUnknownParameters: options?.raiseUnknownParameters, // TODO: turn this true by default in the future
  //   ...options?.schema,
  // }

  // const schema = {
  //   ...openapiConfig,
  //   paths: OpenAPIPaths,
  // }

  // Quick fix, to make api spec valid
  // delete schema.raiseUnknownParameters

  // @ts-ignore
  const routerProxy: OpenAPIRouter = new Proxy(router, {
    // @ts-ignore
    get: (target: any, prop: string, receiver: object) => {
      // console.log(path)
      if (prop === 'original') {
        return router
      }
      if (prop === 'schema') {
        return getGeneratedSchema()
      }
      if (prop === 'registry') {
        return registry
      }

      return (route: string, ...handlers: any) => {
        if (prop !== 'handle') {
          if (
            handlers.length === 1 &&
            handlers[0].registry instanceof OpenAPIRegistryMerger
          ) {
            const nestedRouter = handlers[0]

            // Merge nested router definitions into outer router
            registry.merge(nestedRouter.registry)
          } else if (prop !== 'all') {
            const parsedRoute =
              (options?.base || '') +
              route
                .replace(/\/+(\/|$)/g, '$1') // strip double & trailing splash
                .replace(/:(\w+)/g, '{$1}') // convert parameters into openapi compliant

            // @ts-ignore
            let schema: RouteConfig = undefined
            // @ts-ignore
            let operationId: string = undefined

            for (const handler of handlers) {
              if (handler.name) {
                operationId = `${prop.toString()}_${handler.name}`
              }

              if (handler.getSchemaZod) {
                schema = handler.getSchemaZod()
                // console.log(schema)
                break
              }
            }

            if (operationId === undefined) {
              operationId = `${prop.toString()}_${route.replaceAll('/', '_')}`
            }

            if (schema === undefined) {
              // No schema for this route, try to guest the parameters

              // @ts-ignore
              schema = {
                operationId: operationId,
                responses: {
                  200: {
                    description: 'Object with user data.',
                  },
                },
              }

              const params = route.match(/:(\w+)/g)
              if (params) {
                schema.request = {
                  // TODO: make sure this works
                  params: z.object(
                    params.reduce(
                      (obj, item) => Object.assign(obj, { [item]: z.string() }),
                      {}
                    )
                  ),
                }
              }
            } else {
              // Schema was provided in the endpoint
              if (!schema.operationId) {
                if (
                  options?.generateOperationIds === false &&
                  !schema.operationId
                ) {
                  throw new Error(`Route ${route} don't have operationId set!`)
                }

                schema.operationId = operationId
              }
            }

            registry.registerPath({
              ...schema,
              // @ts-ignore
              method: prop.toString(),
              path: parsedRoute,
            })
          }
        }

        // console.log(`${prop.toString()}`)
        // @ts-ignore
        // console.log(Reflect.routes)
        return Reflect.get(
          target,
          prop,
          receiver
          // path
        )(
          route,
          ...handlers.map((handler: any) => {
            // console.log(route)
            // console.log(handlers)
            if (handler.handle) {
              // Nested router
              return handler.handle
            }

            if (handler.isRoute) {
              // console.log(handler)
              return (...params: any[]) =>
                new handler({
                  // raiseUnknownParameters: openapiConfig.raiseUnknownParameters,  TODO
                }).execute(...params)
            }

            // console.log(handler())
            return handler
          })
        )
      }
    },
  })

  if (options?.docs_url !== null && options?.openapi_url !== null) {
    router.get(options?.docs_url || '/docs', () => {
      return new Response(
        getSwaggerUI(
          (options?.base || '') + (options?.openapi_url || '/openapi.json')
        ),
        {
          headers: {
            'content-type': 'text/html; charset=UTF-8',
          },
          status: 200,
        }
      )
    })
  }

  if (options?.redoc_url !== null && options?.openapi_url !== null) {
    router.get(options?.redoc_url || '/redocs', () => {
      return new Response(
        getReDocUI(
          (options?.base || '') + (options?.openapi_url || '/openapi.json')
        ),
        {
          headers: {
            'content-type': 'text/html; charset=UTF-8',
          },
          status: 200,
        }
      )
    })
  }

  if (options?.openapi_url !== null) {
    router.get(options?.openapi_url || '/openapi.json', () => {
      return new Response(JSON.stringify(getGeneratedSchema()), {
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
        status: 200,
      })
    })
  }

  if (options?.aiPlugin && options?.openapi_url !== null) {
    router.get('/.well-known/ai-plugin.json', (request: IRequest) => {
      const schemaApi = {
        type: APIType.OPENAPI,
        has_user_authentication: false,
        url: options?.openapi_url || '/openapi.json',
        ...options?.aiPlugin?.api,
      }

      // Check if schema path is relative
      if (!schemaApi.url.startsWith('http')) {
        // dynamically add the host
        schemaApi.url = `https://${request.headers.get('host')}${schemaApi.url}`
      }

      return new Response(
        JSON.stringify({
          schema_version: SchemaVersion.V1,
          auth: {
            type: AuthType.NONE,
          },
          ...options?.aiPlugin,
          api: schemaApi,
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
