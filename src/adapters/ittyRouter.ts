import { OpenAPIHandler, type OpenAPIRouterType } from "../openapi";
import type { OpenAPIRoute } from "../route";
import type { RouterOptions } from "../types";

export type IttyRouterOpenAPIRouterType<M> = OpenAPIRouterType<M> & {
  all(path: string, endpoint: typeof OpenAPIRoute<any>): (M & any)["all"];
  all(path: string, router: M): (M & any)["all"];
  delete(path: string, endpoint: typeof OpenAPIRoute<any>): (M & any)["delete"];
  delete(path: string, router: M): (M & any)["delete"];
  get(path: string, endpoint: typeof OpenAPIRoute<any>): (M & any)["get"];
  get(path: string, router: M): (M & any)["get"];
  head(path: string, endpoint: typeof OpenAPIRoute<any>): (M & any)["head"];
  head(path: string, router: M): (M & any)["head"];
  patch(path: string, endpoint: typeof OpenAPIRoute<any>): (M & any)["patch"];
  patch(path: string, router: M): (M & any)["patch"];
  post(path: string, endpoint: typeof OpenAPIRoute<any>): (M & any)["post"];
  post(path: string, router: M): (M & any)["post"];
  put(path: string, endpoint: typeof OpenAPIRoute<any>): (M & any)["put"];
  put(path: string, router: M): (M & any)["put"];
};

export class IttyRouterOpenAPIHandler extends OpenAPIHandler {
  getRequest(args: any[]) {
    return args[0];
  }

  getUrlParams(args: any[]): Record<string, any> {
    return args[0].params;
  }

  getBindings(args: any[]): Record<string, any> {
    return args[1];
  }
}

export function fromIttyRouter<M>(router: M, options?: RouterOptions): M & IttyRouterOpenAPIRouterType<M> {
  const openapiRouter = new IttyRouterOpenAPIHandler(router, options);

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
              nestedRouter: handlers[0],
              path: undefined,
            });
          } else if (openapiRouter.allowedMethods.includes(prop)) {
            handlers = openapiRouter.registerRoute({
              method: prop,
              path: route,
              handlers: handlers,
            });
          }
        }

        return Reflect.get(target, prop, ...args)(route, ...handlers);
      };
    },
  });
}
