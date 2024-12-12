import { OpenAPIHandler, type OpenAPIRouterType } from "../openapi";
import type { OpenAPIRoute } from "../route";
import type { RouterOptions } from "../types";

export type HonoOpenAPIRouterType<M> = OpenAPIRouterType<M> & {
  on(method: string, path: string, endpoint: typeof OpenAPIRoute<any>): M;
  on(method: string, path: string, router: M): M;
};

export class HonoOpenAPIHandler extends OpenAPIHandler {
  getRequest(args: any[]) {
    return args[0].req.raw;
  }

  getUrlParams(args: any[]): Record<string, any> {
    return args[0].req.param();
  }

  getBindings(args: any[]): Record<string, any> {
    return args[0].env;
  }
}

export function fromHono<M>(router: M, options?: RouterOptions): M & HonoOpenAPIRouterType<M> {
  const openapiRouter = new HonoOpenAPIHandler(router, options);

  return new Proxy(router, {
    get: (target: any, prop: string, ...args: any[]) => {
      const _result = openapiRouter.handleCommonProxy(target, prop, ...args);
      if (_result !== undefined) {
        return _result;
      }

      return (route: string, ...handlers: any[]) => {
        if (prop !== "fetch") {
          if (handlers.length === 1 && handlers[0].isChanfana === true) {
            handlers = openapiRouter.registerNestedRouter({
              method: prop,
              path: route,
              nestedRouter: handlers[0],
            });
          } else if (openapiRouter.allowedMethods.includes(prop)) {
            handlers = openapiRouter.registerRoute({
              method: prop,
              path: route,
              handlers: handlers,
            });
          } else if (prop === "on") {
            const methods: string | string[] = route;
            const paths: string | string[] = handlers.shift();

            if (Array.isArray(methods) || Array.isArray(paths)) {
              throw new Error("chanfana only supports single method+path on hono.on('method', 'path', EndpointClass)");
            }

            handlers = openapiRouter.registerRoute({
              method: methods.toLowerCase(),
              path: paths,
              handlers: handlers,
            });

            handlers = [paths, ...handlers];
          }
        }

        return Reflect.get(target, prop, ...args)(route, ...handlers);
      };
    },
  });
}
