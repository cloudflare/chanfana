import type { Context, Hono, Input } from "hono";
import type {
  BlankInput,
  BlankSchema,
  Env,
  H,
  HandlerResponse,
  MergePath,
  MergeSchemaPath,
  Schema,
  ToSchema,
  TypedResponse,
} from "hono/types";
import type { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import type { JSONParsed } from "hono/utils/types";
import type { z, ZodType } from "zod";
import { type NestedRouter, OpenAPIHandler, type OpenAPIRouterType, type RouteHandler } from "../openapi";
import type { OpenAPIRouteClass } from "../route";
import type { AnyZodObject, IsEqual, RouterOptions, Simplify } from "../types";
import { formatChanfanaError, validateBasePath } from "../utils";

type MergeTypedResponse<T> =
  T extends Promise<infer T2>
    ? T2 extends TypedResponse
      ? T2
      : TypedResponse
    : T extends TypedResponse
      ? T
      : TypedResponse;

// Mirrors Hono's own `R extends AnyHandlerResponse = DefaultHandlerResponse` handler generics, so that type inference matches Hono's
// oxlint-disable-next-line typescript/no-explicit-any -- mirrors Hono's HandlerInterface generics
type AnyHandlerResponse = HandlerResponse<any>;
// oxlint-disable-next-line typescript/no-explicit-any -- mirrors Hono's HandlerInterface generics
type DefaultHandlerResponse = any;

type HonoMethodFn = (...args: unknown[]) => unknown;

// Types used to expose an OpenAPIRoute's schema to Hono's RPC client (`hc` from "hono/client").
// They only read the type of the endpoint's `schema` property; endpoints with a non-literal schema
// (e.g. annotated as `OpenAPIRouteSchema` or built in `getSchema()`) fall back to Hono's untyped defaults.

type NoInput = Record<never, never>;

type IsDeclared<T> = undefined extends T ? false : true;

// Query, path and header values always travel as strings, so the client accepts strings (keeping string literal unions)
type StringifyValue<V> = V extends string
  ? V
  : V extends undefined
    ? undefined
    : V extends readonly (infer U)[]
      ? (U extends string ? U : string)[]
      : string;
type StringifyRecord<T> = Simplify<{ [K in keyof T]: StringifyValue<T[K]> }>;

// `contentJson()` erases its schema to the base `z.ZodType<T>` (input `unknown`), so only that exact type falls back
// to the output type. Other schemas with an `unknown` input (e.g. `z.preprocess()`) keep it.
type ZodClientInput<T extends ZodType> = IsEqual<T, z.ZodType<z.output<T>>> extends true ? z.output<T> : z.input<T>;

type RequestPartInput<Request, Part extends string, Target extends string> =
  Request extends Record<Part, infer V>
    ? IsDeclared<V> extends true
      ? V extends AnyZodObject
        ? NoInput extends z.input<V>
          ? { [K in Target]?: StringifyRecord<z.input<V>> }
          : { [K in Target]: StringifyRecord<z.input<V>> }
        : NoInput
      : NoInput
    : NoInput;

type RequestJsonInput<Request> = Request extends { body: infer B }
  ? B extends { content: { "application/json": { schema: infer Z } } }
    ? Z extends ZodType
      ? { json: ZodClientInput<Z> }
      : NoInput
    : NoInput
  : NoInput;

type RouteRequestInput<Request> =
  IsDeclared<Request> extends true
    ? RequestPartInput<Request, "params", "param"> &
        RequestPartInput<Request, "query", "query"> &
        RequestPartInput<Request, "headers", "header"> &
        RequestJsonInput<Request>
    : NoInput;

/** Hono `Input` inferred from an OpenAPIRoute class' `schema.request` (params, query, headers and JSON body). */
export type OpenAPIRouteHonoInput<T extends OpenAPIRouteClass> = InstanceType<T>["schema"] extends {
  request: infer Request;
}
  ? RouteRequestInput<Request> extends infer In
    ? keyof In extends never
      ? BlankInput
      : { in: { [K in keyof In]: In[K] }; out: { [K in keyof In]: In[K] } }
    : BlankInput
  : BlankInput;

type StatusFromKey<K> = K extends StatusCode ? K : K extends `${infer N extends StatusCode}` ? N : never;

type ResponsesToTypedResponse<Responses> = {
  [K in keyof Responses]: Responses[K] extends { content: { "application/json": { schema: infer Z } } }
    ? Z extends ZodType
      ? [StatusFromKey<K>] extends [never]
        ? never
        : TypedResponse<JSONParsed<z.output<Z>>, StatusFromKey<K>, "json">
      : never
    : never;
}[keyof Responses];

/**
 * Hono handler response inferred from an OpenAPIRoute class' `schema.responses`: one `TypedResponse` per status code
 * with an `application/json` Zod schema, typed as the JSON-serialized schema output (like Hono's `c.json()`). Falls back to `any` (Hono's untyped default) when nothing can be inferred.
 */
export type OpenAPIRouteHonoOutput<T extends OpenAPIRouteClass> = InstanceType<T>["schema"] extends {
  responses: infer Responses;
}
  ? IsDeclared<Responses> extends true
    ? [ResponsesToTypedResponse<Responses>] extends [never]
      ? DefaultHandlerResponse
      : ResponsesToTypedResponse<Responses>
    : DefaultHandlerResponse
  : DefaultHandlerResponse;

type OpenAPIRouteToSchema<
  M extends string,
  P extends string,
  T extends OpenAPIRouteClass,
  BasePath extends string,
> = ToSchema<M, MergePath<BasePath, P>, OpenAPIRouteHonoInput<T>, OpenAPIRouteHonoOutput<T>>;

const HIJACKED_METHODS = new Set(["basePath", "on", "route", "delete", "get", "patch", "post", "put", "all"]);

export type HonoOpenAPIRouterType<
  E extends Env = Env,
  S extends Schema = BlankSchema,
  BasePath extends string = "/",
> = OpenAPIRouterType<Hono<E, S, BasePath>> & {
  on(method: string, path: string, endpoint: OpenAPIRouteClass): Hono<E, S, BasePath>["on"];
  on(method: string, path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["on"];

  route<SubPath extends string, SubEnv extends Env, SubSchema extends Schema, SubBasePath extends string>(
    path: SubPath,
    app: HonoOpenAPIRouterType<SubEnv, SubSchema, SubBasePath>,
  ): HonoOpenAPIRouterType<E, MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> & S, BasePath>;

  all<P extends string, T extends OpenAPIRouteClass>(
    path: P,
    endpoint: T,
  ): HonoOpenAPIRouterType<E, S & OpenAPIRouteToSchema<"all", P, T, BasePath>, BasePath>;
  all<P extends string, I extends Input = BlankInput, R extends AnyHandlerResponse = DefaultHandlerResponse>(
    path: P,
    endpoint: OpenAPIRouteClass | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"all", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;

  delete<P extends string, T extends OpenAPIRouteClass>(
    path: P,
    endpoint: T,
  ): HonoOpenAPIRouterType<E, S & OpenAPIRouteToSchema<"delete", P, T, BasePath>, BasePath>;
  delete<P extends string, I extends Input = BlankInput, R extends AnyHandlerResponse = DefaultHandlerResponse>(
    path: P,
    endpoint: OpenAPIRouteClass | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"delete", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  delete(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["delete"];
  get<P extends string, T extends OpenAPIRouteClass>(
    path: P,
    endpoint: T,
  ): HonoOpenAPIRouterType<E, S & OpenAPIRouteToSchema<"get", P, T, BasePath>, BasePath>;
  get<P extends string, I extends Input = BlankInput, R extends AnyHandlerResponse = DefaultHandlerResponse>(
    path: P,
    endpoint: OpenAPIRouteClass | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"get", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  get(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["get"];
  patch<P extends string, T extends OpenAPIRouteClass>(
    path: P,
    endpoint: T,
  ): HonoOpenAPIRouterType<E, S & OpenAPIRouteToSchema<"patch", P, T, BasePath>, BasePath>;
  patch<P extends string, I extends Input = BlankInput, R extends AnyHandlerResponse = DefaultHandlerResponse>(
    path: P,
    endpoint: OpenAPIRouteClass | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"patch", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  patch(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["patch"];
  post<P extends string, T extends OpenAPIRouteClass>(
    path: P,
    endpoint: T,
  ): HonoOpenAPIRouterType<E, S & OpenAPIRouteToSchema<"post", P, T, BasePath>, BasePath>;
  post<P extends string, I extends Input = BlankInput, R extends AnyHandlerResponse = DefaultHandlerResponse>(
    path: P,
    endpoint: OpenAPIRouteClass | H,
  ): HonoOpenAPIRouterType<E, S & ToSchema<"post", MergePath<BasePath, P>, I, MergeTypedResponse<R>>, BasePath>;
  post(path: string, router: Hono<E, S, BasePath>): Hono<E, S, BasePath>["post"];
  put<P extends string, T extends OpenAPIRouteClass>(
    path: P,
    endpoint: T,
  ): HonoOpenAPIRouterType<E, S & OpenAPIRouteToSchema<"put", P, T, BasePath>, BasePath>;
  put<P extends string, I extends Input = BlankInput, R extends AnyHandlerResponse = DefaultHandlerResponse>(
    path: P,
    endpoint: OpenAPIRouteClass | H,
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
function getHonoBasePath(router: unknown): string | undefined {
  const bp = typeof router === "object" && router !== null ? Reflect.get(router, "_basePath") : undefined;
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
  protected override get routerHandlesBasePrefix(): boolean {
    return true;
  }

  /**
   * Wraps route handlers to catch chanfana errors (ZodError, ApiException)
   * and convert them to Hono HTTPException instances. This allows errors to
   * flow through Hono's onError handler while preserving chanfana's default
   * error response format via HTTPException.getResponse().
   */
  protected override wrapHandler(handler: RouteHandler): RouteHandler {
    if (this.options?.passthroughErrors) {
      return handler;
    }

    return async (...args) => {
      try {
        return await handler(...args);
      } catch (e) {
        const response = formatChanfanaError(e);
        if (response) {
          const { HTTPException } = await import("hono/http-exception");
          throw new HTTPException(response.status as ContentfulStatusCode, { res: response });
        }
        throw e;
      }
    };
  }

  override getRequest(args: unknown[]): Request {
    return (args[0] as Context).req.raw;
  }

  // oxlint-disable-next-line typescript/no-explicit-any -- public back-compat, consumers access bindings/params without narrowing
  override getUrlParams(args: unknown[]): Record<string, any> {
    return (args[0] as Context).req.param();
  }

  // oxlint-disable-next-line typescript/no-explicit-any -- public back-compat, consumers access bindings/params without narrowing
  override getBindings(args: unknown[]): Record<string, any> {
    return (args[0] as Context).env;
  }
}

type HonoNestedRouter = NestedRouter & { original: Hono };

function isChanfanaRouter(value: unknown): value is HonoNestedRouter {
  return typeof value === "object" && value !== null && Reflect.get(value, "isChanfana") === true;
}

function isRouteLike(value: unknown): boolean {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    Boolean(Reflect.get(value, "isRoute"))
  );
}

export function fromHono<
  M extends Hono<E, S, BasePath>,
  E extends Env = M extends Hono<infer E, infer _S, infer _BP> ? E : never,
  S extends Schema = M extends Hono<infer _E, infer S, infer _BP> ? S : never,
  BasePath extends string = M extends Hono<infer _E, infer _S, infer BP> ? BP : never,
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

  const proxy: object = new Proxy<object>(basedRouter, {
    get: (target: object, prop: string | symbol, receiver: unknown) => {
      const _result = openapiRouter.handleCommonProxy(target, prop, receiver);
      if (_result !== undefined) {
        return _result;
      }

      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string") {
        return value;
      }

      return (route: string, ...rawHandlers: unknown[]) => {
        let handlers = rawHandlers;

        if (prop !== "fetch") {
          const firstHandler = handlers[0];
          if (prop === "route" && handlers.length === 1 && isChanfanaRouter(firstHandler)) {
            openapiRouter.registerNestedRouter({
              method: "",
              nestedRouter: firstHandler,
              path: route,
            });

            // Hacky clone
            const subApp = firstHandler.original.basePath("");

            const excludePath = new Set(["/openapi.json", "/openapi.yaml", "/docs", "/redocs"]);
            subApp.routes = subApp.routes.filter((obj) => {
              return !excludePath.has(obj.path);
            });

            basedRouter.route(route, subApp);
            return proxy;
          }

          if (prop === "all" && handlers.length === 1 && isRouteLike(firstHandler)) {
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
            const paths: unknown = handlers.shift();

            if (Array.isArray(methods) || typeof paths !== "string") {
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

        const resp = (Reflect.get(target, prop, receiver) as HonoMethodFn)(route, ...handlers);

        if (HIJACKED_METHODS.has(prop)) {
          return proxy;
        }

        return resp;
      };
    },
  });

  return proxy as HonoOpenAPIRouterType<E, S, BasePath>;
}
