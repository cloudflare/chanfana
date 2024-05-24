import { RouterOptions } from '../types'
import { OpenAPIHandler, OpenAPIRouterType } from '../openapi'

export class IttyRouterOpenAPIHandler extends OpenAPIHandler {
}

export function fromIttyRouter<M>(
  router: M,
  options?: RouterOptions,
): M & OpenAPIRouterType<M> & any {
  const openapiRouter = new IttyRouterOpenAPIHandler(router, options)

  return new Proxy(router, {
    get: (target: any, prop: string, ...args: any[]) => {
      const _result = openapiRouter.handleCommonProxy(target, prop, ...args)
      if (_result !== undefined) {
        return _result
      }

      return (route: string, ...handlers: any[]) => {
        if (prop !== 'fetch') {
          if (handlers.length === 1 && handlers[0].registry) {
            handlers = openapiRouter.registerNestedRouter({
              method: prop,
              path: route,
              nestedRouter: handlers[0],
            })
          } else if (prop !== 'all') {
            handlers = openapiRouter.registerRoute({
              method: prop,
              path: route,
              handlers: handlers,
            })
          }
        }

        return Reflect.get(target, prop, ...args)(route, ...handlers)
      }
    },
  })
}
