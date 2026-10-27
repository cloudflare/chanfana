import { type NestedRouter, OpenAPIHandler, type OpenAPIRouterType } from "../openapi";
import type { OpenAPIRouteClass } from "../route";
import type { RouterOptions } from "../types";

// The underlying itty-router calls return values that are not tracked by these overloads,
// historically typed as `any` so that consumers can keep chaining calls freely.
// biome-ignore lint/suspicious/noExplicitAny: kept for backward compatibility of chained router calls
type IttyRouterMethodResult = any;

export type IttyRouterOpenAPIRouterType<M> = OpenAPIRouterType<M> & {
  all(path: string, endpoint: OpenAPIRouteClass): IttyRouterMethodResult;
  all(path: string, router: M): IttyRouterMethodResult;
  delete(path: string, endpoint: OpenAPIRouteClass): IttyRouterMethodResult;
  delete(path: string, router: M): IttyRouterMethodResult;
  get(path: string, endpoint: OpenAPIRouteClass): IttyRouterMethodResult;
  get(path: string, router: M): IttyRouterMethodResult;
  head(path: string, endpoint: OpenAPIRouteClass): IttyRouterMethodResult;
  head(path: string, router: M): IttyRouterMethodResult;
  patch(path: string, endpoint: OpenAPIRouteClass): IttyRouterMethodResult;
  patch(path: string, router: M): IttyRouterMethodResult;
  post(path: string, endpoint: OpenAPIRouteClass): IttyRouterMethodResult;
  post(path: string, router: M): IttyRouterMethodResult;
  put(path: string, endpoint: OpenAPIRouteClass): IttyRouterMethodResult;
  put(path: string, router: M): IttyRouterMethodResult;
};

type IttyMethodFn = (...args: unknown[]) => unknown;

function isChanfanaRouter(value: unknown): value is NestedRouter {
  return typeof value === "object" && value !== null && Reflect.get(value, "isChanfana") === true;
}

export class IttyRouterOpenAPIHandler extends OpenAPIHandler {
  override getRequest(args: unknown[]): Request {
    return args[0] as Request;
  }

  // biome-ignore lint/suspicious/noExplicitAny: public back-compat, consumers access bindings/params without narrowing
  override getUrlParams(args: unknown[]): Record<string, any> {
    return (args[0] as { params: Record<string, string> }).params;
  }

  // biome-ignore lint/suspicious/noExplicitAny: public back-compat, consumers access bindings/params without narrowing
  override getBindings(args: unknown[]): Record<string, any> {
    return args[1] as Record<string, unknown>;
  }
}

export function fromIttyRouter<M>(router: M, options?: RouterOptions): M & IttyRouterOpenAPIRouterType<M> {
  // itty-router has no onError handler, so raiseOnError must always be disabled
  // to ensure errors are caught and formatted by execute() instead of propagating unhandled.
  const { raiseOnError: _ignored, ...safeOptions } = options || {};
  const openapiRouter = new IttyRouterOpenAPIHandler(router, safeOptions);

  const proxy = new Proxy<object>(router as object, {
    get: (target: object, prop: string | symbol, receiver: unknown) => {
      const _result = openapiRouter.handleCommonProxy(target, prop, receiver);
      if (_result !== undefined) {
        return _result;
      }

      return (route: string, ...rawHandlers: unknown[]) => {
        let handlers = rawHandlers;

        if (prop !== "fetch" && typeof prop === "string") {
          const firstHandler = handlers[0];
          if (handlers.length === 1 && isChanfanaRouter(firstHandler)) {
            handlers = openapiRouter.registerNestedRouter({
              method: prop,
              nestedRouter: firstHandler,
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

        return (Reflect.get(target, prop, receiver) as IttyMethodFn)(route, ...handlers);
      };
    },
  });

  return proxy as M & IttyRouterOpenAPIRouterType<M>;
}
