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
import { formatChanfanaError, validateBasePath } from "../utils";

type MergeTypedResponse<T> =
  T extends Promise<infer T2>
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

/**
 * Defensively reads Hono's base path from its internal `_basePath` property.
 * This is not part of Hono's public API — if Hono changes this internal,
 * the fallback is that users must pass the `base` option to fromHono() explicitly.
 *
 * @returns The detected base path, or undefined if not available or "/"
 */
function getHonoBasePath(router: any): string | undefined {
  const bp = router?._basePath;
  if (typeof bp !== "string" || bp === "/") {
    return undefined;
  }
  if (bp.endsWith("/")) {
    const normalized = bp.replace(/\/+$/, "");
    console.warn(
      `Hono basePath has a trailing slash ("${bp}"). ` +
        `Use basePath("${normalized}") instead of basePath("${bp}") to avoid issues.`,
    );
    return normalized;
  }
  return bp;
}

export class HonoOpenAPIHandler extends OpenAPIHandler {
  protected get routerHandlesBasePrefix(): boolean {
    return true;
  }

  /**
   * Wraps route handlers to catch chanfana errors (ZodError, ApiException)
   * and convert them to Hono HTTPException instances. This allows errors to
   * flow through Hono's onError handler while preserving chanfana's default
   * error response format via HTTPException.getResponse().
   */
  protected wrapHandler(handler: (...args: any[]) => Promise<Response>): (...args: any[]) => Promise<Response> {
    return async (...args: any[]) => {
      try {
        return await handler(...args);
      } catch (e) {
        const response = formatChanfanaError(e);
        if (response) {
          const { HTTPException } = await import("hono/http-exception");
          throw new HTTPException(response.status as any, { res: response });
        }
        throw e;
      }
    };
  }

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
  // Validate base format early, before Hono's basePath() is called.
  // The OpenAPIHandler constructor also validates, but basePath() runs first here.
  if (options?.base) {
    validateBasePath(options.base);
  }

  // Detect pre-existing basePath on the Hono instance (e.g. new Hono().basePath("/api"))
  const existingBase = getHonoBasePath(router);

  if (existingBase && options?.base) {
    throw new Error(
      `Detected Hono basePath "${existingBase}" and chanfana base option "${options.base}". ` +
        `As of chanfana 3.1, the base option is no longer needed when using Hono's basePath() — ` +
        `the base path "${existingBase}" is detected automatically. ` +
        `Please remove the base option from fromHono().`,
    );
  }

  // If chanfana base option is provided (and no pre-existing basePath), apply it via Hono's basePath()
  // so that both route matching and schema generation use the same prefix.
  // If the router already has a basePath, use it as-is — routes already match at the prefixed path.
  const basedRouter = options?.base ? router.basePath(options.base) : router;

  // Read the effective base from the (possibly based) router for schema generation.
  // This covers both cases: chanfana's base applied via basePath(), or pre-existing basePath.
  const effectiveBase = getHonoBasePath(basedRouter);
  const effectiveOptions = { ...(effectiveBase ? { ...options, base: effectiveBase } : options), raiseOnError: true };

  const openapiRouter = new HonoOpenAPIHandler(basedRouter, effectiveOptions);

  const proxy = new Proxy(basedRouter, {
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

            basedRouter.route(route, subApp);
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
