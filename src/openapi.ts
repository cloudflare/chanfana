import { getReDocUI, getSwaggerUI } from './ui'
import {
  IRequest,
  RouteHandler,
  Router,
  RouterType,
  UniversalRoute,
} from 'itty-router'
import { APIType, AuthType, RouterOptions, SchemaVersion } from './types'
import {
  OpenApiGeneratorV3,
  OpenApiGeneratorV31,
  RouteConfig,
} from '@asteasolutions/zod-to-openapi'
import { OpenAPIRegistryMerger } from './zod/registry'
import { z } from 'zod'
import { OpenAPIObject } from 'openapi3-ts/oas31'
import { OpenAPIRoute } from './route'

export type Route = <
  RequestType = IRequest,
  Args extends any[] = any[],
  RT = OpenAPIRouterType
>(
  path: string,
  ...handlers: (RouteHandler<RequestType, Args> | OpenAPIRouterType | any)[] // TODO: fix this any to be instance of OpenAPIRoute
) => RT

export type OpenAPIRouterType<R = Route, Args extends any[] = any[]> = {
  original: RouterType<R>
  schema: OpenAPIObject
  registry: OpenAPIRegistryMerger
} & RouterType<R>

// helper function to detect equality in types (used to detect custom Request on router)
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false

export function OpenAPIRouter<
  RequestType = IRequest,
  Args extends any[] = any[],
  RouteType = Equal<RequestType, IRequest> extends true
    ? Route
    : UniversalRoute<RequestType, Args>
>(options?: RouterOptions): OpenAPIRouterType<RouteType, Args> {
  const registry: OpenAPIRegistryMerger = new OpenAPIRegistryMerger()

  const getGeneratedSchema = (): OpenAPIObject => {
    let openapiGenerator: any = OpenApiGeneratorV31
    if (options?.openapiVersion === '3') openapiGenerator = OpenApiGeneratorV3

    const generator = new openapiGenerator(registry.definitions)

    return generator.generateDocument({
      openapi: options?.openapiVersion === '3' ? '3.0.3' : '3.1.0',
      info: {
        version: options?.schema?.info?.version || '1.0.0',
        title: options?.schema?.info?.title || 'OpenAPI',
        ...options?.schema?.info,
      },
      ...options?.schema,
    })
  }

  const routerToUse = options?.baseRouter || Router

  const router = routerToUse({ base: options?.base, routes: options?.routes })

  const routerProxy: OpenAPIRouterType<RouteType, Args> = new Proxy(router, {
    // @ts-expect-error (we're adding an expected prop "path" to the get)
    get: (target: any, prop: string, receiver: object, path: string) => {
      if (prop === 'original') {
        return router
      }
      if (prop === 'schema') {
        return getGeneratedSchema()
      }
      if (prop === 'registry') {
        return registry
      }

      return (
        route: string,
        ...handlers: RouteHandler<RequestType, Args>[] &
          typeof OpenAPIRoute[] &
          OpenAPIRouterType<RouteType, Args>[]
      ) => {
        if (prop !== 'handle') {
          if (handlers.length === 1 && handlers[0].registry) {
            const nestedRouter = handlers[0]

            // Merge inner router definitions into outer router
            registry.merge(nestedRouter.registry)
          } else if (prop !== 'all') {
            const parsedRoute = ((options?.base || '') + route)
              .replaceAll(/\/+(\/|$)/g, '$1') // strip double & trailing splash
              .replaceAll(/:(\w+)/g, '{$1}') // convert parameters into openapi compliant

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
                      // matched parameters start with ':' so replace the first occurrence with nothing
                      (obj, item) =>
                        Object.assign(obj, {
                          [item.replace(':', '')]: z.string(),
                        }),
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
