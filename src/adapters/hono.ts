import type { Hono, Input } from "hono";
import type {
  BlankInput,
  Env,
  H,
  HandlerResponse,
  MergePath,
  MergeSchemaPath,
  Schema,
  ToSchema,
  TypedResponse,
} from "hono/types";
import { OpenAPIHandler, type OpenAPIRouterType } from "../openapi";
import type { OpenAPIRoute } from "../route";
import type { RouterOptions } from "../types";

type MergeTypedResponse<T> = T extends Promise<infer T2>
  ? T2 extends TypedResponse
    ? T2
    : TypedResponse
  : T extends TypedResponse
    ? T
    : TypedResponse;

const HIJACKED_METHODS = new Set(["basePath", "on", "route", "delete", "get", "patch", "post", "put", "all"]);

export type HonoOpenAPIRouterType<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = "/",
> = OpenAPIRouterType<Hono<E, S, BasePath>> & {
  on(method: string, path: string, endpoint: typeof OpenAPIRoute<any>): Hono<E, S, BasePath>["on"];
  on(method: string, path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["on"];

  route<SubPath extends string, SubEnv extends Env, SubSchema extends Schema, SubBasePath extends string>(
    path: SubPath,
    app: HonoOpenAPIRouterType<SubEnv, SubSchema, SubBasePath>,
  ): HonoOpenAPIRouterType<E, MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> | S, BasePath>;

  all<P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    path: P,
    endpoint: typeof OpenAPIRoute<any> | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"all", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;

  delete<P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    path: P,
    endpoint: typeof OpenAPIRoute<any> | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"delete", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  delete(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["delete"];
  get<P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    path: P,
    endpoint: typeof OpenAPIRoute<any> | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"get", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  get(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["get"];
  patch<P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    path: P,
    endpoint: typeof OpenAPIRoute<any> | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"patch", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  patch(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["patch"];
  post<P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    path: P,
    endpoint: typeof OpenAPIRoute<any> | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"post", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  post(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["post"];
  put<P extends string, I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    path: P,
    endpoint: typeof OpenAPIRoute<any> | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"put", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  put(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["put"];
  // Hono must be defined last, for the overwrite method to have priority!
} & Hono<E, S, BasePath>;

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

export function fromHono<
  M extends Hono<E, S, BasePath>,
  E extends Env = M extends Hono<infer E, any, any> ? E : never,
  S extends Schema = M extends Hono<any, infer S, any> ? S : never,
  BasePath extends string = M extends Hono<any, any, infer BP> ? BP : never,
>(router: M, options?: RouterOptions): HonoOpenAPIRouterType<E, S, BasePath> {
  const openapiRouter = new HonoOpenAPIHandler(router, options);

  const proxy = new Proxy(router, {
    get: (target: any, prop: string, ...args: any[]) => {
      const _result = openapiRouter.handleCommonProxy(target, prop, ...args);
      if (_result !== undefined) {
        return _result;
      }

      if (typeof target[prop] !== "function") {
        return target[prop];
      }

      return (route: string, ...handlers: any[]) => {
        if (prop !== "fetch") {
          if (prop === "route" && handlers.length === 1 && handlers[0].isChanfana === true) {
            openapiRouter.registerNestedRouter({
              method: "",
              nestedRouter: handlers[0],
              path: route,
            });

            // Hacky clone
            const subApp = handlers[0].original.basePath("");

            const excludePath = new Set(["/openapi.json", "/openapi.yaml", "/docs", "/redocs"]);
            subApp.routes = subApp.routes.filter((obj: any) => {
              return !excludePath.has(obj.path);
            });

            router.route(route, subApp);
            return proxy;
          }

          if (prop === "all" && handlers.length === 1 && handlers[0].isRoute) {
            handlers = openapiRouter.registerRoute({
              method: prop,
              path: route,
              handlers: handlers,
              doRegister: false,
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

        const resp = Reflect.get(target, prop, ...args)(route, ...handlers);

        if (HIJACKED_METHODS.has(prop)) {
          return proxy;
        }

        return resp;
      };
    },
  });

  return proxy as HonoOpenAPIRouterType<E, S, BasePath>;
}
