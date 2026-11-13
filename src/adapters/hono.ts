import type { Context, Hono, Input, MiddlewareHandler } from "hono";
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
import {
  CHANFANA_VALIDATOR,
  isValidatorMarker,
  type NestedRouter,
  OpenAPIHandler,
  type OpenAPIRouterType,
  type RouteHandler,
  type ValidatorRegistration,
} from "../openapi";
import type { OpenAPIRoute, OpenAPIRouteClass, PrevalidatedData } from "../route";
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

// Types used to type `c.req.valid()` in middleware placed after chanfanaValidator(). Unlike OpenAPIRouteHonoInput
// (the client-side input), these are the validated Zod outputs, with coercions and defaults applied.

// An endpoint with a non-literal schema can't be typed, `any` keeps c.req.valid() usable for every target chanfana validates
type UntypedInput = {
  // oxlint-disable-next-line typescript/no-explicit-any -- see above
  out: { json: any; query: any; param: any; header: any };
};

// Like the built-in NoInfer (TypeScript 5.4+): the input carried from the previous middleware isn't inferred from the
// next one, so a middleware with its own (usually empty) input doesn't drop the validated input
type NoInferInput<T> = [T][T extends unknown ? 0 : never];

type ValidatedRequestPart<Request, Part extends string, Target extends string> =
  Request extends Record<Part, infer V>
    ? IsDeclared<V> extends true
      ? V extends ZodType
        ? { [K in Target]: z.output<V> }
        : NoInput
      : NoInput
    : NoInput;

// GET and HEAD requests have no validated JSON body, so routes that also match them (all()) may not have one either
type ValidatedRequestJson<Request, M extends string> = M extends "get" | "head"
  ? NoInput
  : Request extends { body: infer B }
    ? B extends { content: { "application/json": { schema: infer Z } } }
      ? Z extends ZodType
        ? { json: M extends "all" ? z.output<Z> | undefined : z.output<Z> }
        : NoInput
      : NoInput
    : NoInput;

type ValidatedRouteRequest<Request, M extends string> =
  IsDeclared<Request> extends true
    ? ValidatedRequestPart<Request, "params", "param"> &
        ValidatedRequestPart<Request, "query", "query"> &
        ValidatedRequestPart<Request, "headers", "header"> &
        ValidatedRequestJson<Request, M>
    : NoInput;

/**
 * Hono `Input` with the request data validated by chanfanaValidator() for an OpenAPIRoute class: `c.req.valid()` returns
 * the Zod output of the endpoint's params, query, headers and JSON body (no JSON body for GET/HEAD routes, and possibly
 * `undefined` for `all()` routes, which also match GET/HEAD requests).
 * Endpoints with a non-literal schema (e.g. annotated as `OpenAPIRouteSchema` or built in `getSchema()`) give `any`.
 */
export type OpenAPIRouteHonoValidatedInput<T extends OpenAPIRouteClass, M extends string> =
  Record<never, never> extends InstanceType<T>["schema"]
    ? UntypedInput
    : InstanceType<T>["schema"] extends { request: infer Request }
      ? ValidatedRouteRequest<Request, Lowercase<M>> extends infer Out
        ? { out: { [K in keyof Out]: Out[K] } }
        : BlankInput
      : { out: NoInput };

type ValidatorMarker = { readonly [CHANFANA_VALIDATOR]: true };

/** Input of the handler that follows `Mw`: adds the endpoint's validated input after the chanfanaValidator() marker. */
type After<Mw, I extends Input, T extends OpenAPIRouteClass, M extends string> = Mw extends ValidatorMarker
  ? I & OpenAPIRouteHonoValidatedInput<T, M>
  : I;

// Local copy of Hono's IntersectNonAnyTypes (not exported by every supported Hono version): `any` and the wide `Env`
// don't contribute to the intersection, so untyped middleware keep the Env of the router
type ProcessEnv<T> = 0 extends 1 & T ? NoInput : T extends Env ? (Env extends T ? NoInput : T) : T;
type IntersectEnv<T extends unknown[]> = T extends [infer Head, ...infer Rest]
  ? ProcessEnv<Head> & IntersectEnv<Rest>
  : NoInput;

// oxlint-disable-next-line typescript/no-explicit-any -- untyped fallback for longer chains, like Hono's own variadic overloads
type UntypedHandler = H<any, any, UntypedInput>;

// The chain overloads read the router's Env, Schema and BasePath from `this` instead of taking them as type parameters.
// This keeps them out of HonoOpenAPIRouterType's variance measurement, which otherwise compares every overload
// against Hono's own (very large) handler overloads and exceeds TypeScript's instantiation limits.
type RouterOriginal<Self> = Self extends { original: infer O } ? O : never;
type EnvOf<Self> = RouterOriginal<Self> extends Hono<infer E, infer _S, infer _BP> ? E : Env;
type BaseOf<Self> = RouterOriginal<Self> extends Hono<infer _E, infer _S, infer BP> ? BP : string;
type EndpointChainResult<Self, M extends string, P extends string, T extends OpenAPIRouteClass> =
  RouterOriginal<Self> extends Hono<infer E, infer S, infer BP>
    ? HonoOpenAPIRouterType<E, S & OpenAPIRouteToSchema<M, P, T, BP>, BP>
    : never;

/**
 * Overloads for routes that run middleware before an OpenAPIRoute endpoint, e.g. `post(path, authMw, Endpoint)`.
 * Up to 5 middleware are typed: each one sees the Env of the middleware before it and, after chanfanaValidator(),
 * the endpoint's validated input. Longer chains fall back to untyped handlers.
 */
interface HonoEndpointChain<Method extends string> {
  <Self, P extends string, T extends OpenAPIRouteClass, E2 extends Env = EnvOf<Self>, I extends Input = BlankInput>(
    this: Self,
    path: P,
    m1: H<E2, MergePath<BaseOf<Self>, P>, I>,
    endpoint: T,
  ): EndpointChainResult<Self, Method, P, T>;
  <
    Self,
    P extends string,
    T extends OpenAPIRouteClass,
    E2 extends Env = EnvOf<Self>,
    E3 extends Env = IntersectEnv<[EnvOf<Self>, E2]>,
    I extends Input = BlankInput,
    M1 extends H<E2, MergePath<BaseOf<Self>, P>, I> = H<E2, MergePath<BaseOf<Self>, P>, I>,
    I2 extends Input = After<M1, I, T, Method>,
  >(
    this: Self,
    path: P,
    m1: H<E2, MergePath<BaseOf<Self>, P>, I> & M1,
    m2: H<E3, MergePath<BaseOf<Self>, P>, NoInferInput<I2>>,
    endpoint: T,
  ): EndpointChainResult<Self, Method, P, T>;
  <
    Self,
    P extends string,
    T extends OpenAPIRouteClass,
    E2 extends Env = EnvOf<Self>,
    E3 extends Env = IntersectEnv<[EnvOf<Self>, E2]>,
    E4 extends Env = IntersectEnv<[EnvOf<Self>, E2, E3]>,
    I extends Input = BlankInput,
    M1 extends H<E2, MergePath<BaseOf<Self>, P>, I> = H<E2, MergePath<BaseOf<Self>, P>, I>,
    I2 extends Input = After<M1, I, T, Method>,
    M2 extends H<E3, MergePath<BaseOf<Self>, P>, I2> = H<E3, MergePath<BaseOf<Self>, P>, I2>,
    I3 extends Input = After<M2, I2, T, Method>,
  >(
    this: Self,
    path: P,
    m1: H<E2, MergePath<BaseOf<Self>, P>, I> & M1,
    m2: H<E3, MergePath<BaseOf<Self>, P>, NoInferInput<I2>> & M2,
    m3: H<E4, MergePath<BaseOf<Self>, P>, NoInferInput<I3>>,
    endpoint: T,
  ): EndpointChainResult<Self, Method, P, T>;
  <
    Self,
    P extends string,
    T extends OpenAPIRouteClass,
    E2 extends Env = EnvOf<Self>,
    E3 extends Env = IntersectEnv<[EnvOf<Self>, E2]>,
    E4 extends Env = IntersectEnv<[EnvOf<Self>, E2, E3]>,
    E5 extends Env = IntersectEnv<[EnvOf<Self>, E2, E3, E4]>,
    I extends Input = BlankInput,
    M1 extends H<E2, MergePath<BaseOf<Self>, P>, I> = H<E2, MergePath<BaseOf<Self>, P>, I>,
    I2 extends Input = After<M1, I, T, Method>,
    M2 extends H<E3, MergePath<BaseOf<Self>, P>, I2> = H<E3, MergePath<BaseOf<Self>, P>, I2>,
    I3 extends Input = After<M2, I2, T, Method>,
    M3 extends H<E4, MergePath<BaseOf<Self>, P>, I3> = H<E4, MergePath<BaseOf<Self>, P>, I3>,
    I4 extends Input = After<M3, I3, T, Method>,
  >(
    this: Self,
    path: P,
    m1: H<E2, MergePath<BaseOf<Self>, P>, I> & M1,
    m2: H<E3, MergePath<BaseOf<Self>, P>, NoInferInput<I2>> & M2,
    m3: H<E4, MergePath<BaseOf<Self>, P>, NoInferInput<I3>> & M3,
    m4: H<E5, MergePath<BaseOf<Self>, P>, NoInferInput<I4>>,
    endpoint: T,
  ): EndpointChainResult<Self, Method, P, T>;
  <
    Self,
    P extends string,
    T extends OpenAPIRouteClass,
    E2 extends Env = EnvOf<Self>,
    E3 extends Env = IntersectEnv<[EnvOf<Self>, E2]>,
    E4 extends Env = IntersectEnv<[EnvOf<Self>, E2, E3]>,
    E5 extends Env = IntersectEnv<[EnvOf<Self>, E2, E3, E4]>,
    E6 extends Env = IntersectEnv<[EnvOf<Self>, E2, E3, E4, E5]>,
    I extends Input = BlankInput,
    M1 extends H<E2, MergePath<BaseOf<Self>, P>, I> = H<E2, MergePath<BaseOf<Self>, P>, I>,
    I2 extends Input = After<M1, I, T, Method>,
    M2 extends H<E3, MergePath<BaseOf<Self>, P>, I2> = H<E3, MergePath<BaseOf<Self>, P>, I2>,
    I3 extends Input = After<M2, I2, T, Method>,
    M3 extends H<E4, MergePath<BaseOf<Self>, P>, I3> = H<E4, MergePath<BaseOf<Self>, P>, I3>,
    I4 extends Input = After<M3, I3, T, Method>,
    M4 extends H<E5, MergePath<BaseOf<Self>, P>, I4> = H<E5, MergePath<BaseOf<Self>, P>, I4>,
    I5 extends Input = After<M4, I4, T, Method>,
  >(
    this: Self,
    path: P,
    m1: H<E2, MergePath<BaseOf<Self>, P>, I> & M1,
    m2: H<E3, MergePath<BaseOf<Self>, P>, NoInferInput<I2>> & M2,
    m3: H<E4, MergePath<BaseOf<Self>, P>, NoInferInput<I3>> & M3,
    m4: H<E5, MergePath<BaseOf<Self>, P>, NoInferInput<I4>> & M4,
    m5: H<E6, MergePath<BaseOf<Self>, P>, NoInferInput<I5>>,
    endpoint: T,
  ): EndpointChainResult<Self, Method, P, T>;
  <Self, P extends string, T extends OpenAPIRouteClass>(
    this: Self,
    path: P,
    ...handlers: [...UntypedHandler[], T]
  ): EndpointChainResult<Self, Method, P, T>;
}

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
} & {
  // Middleware before an endpoint class, typed with chanfanaValidator()
  all: HonoEndpointChain<"all">;
  delete: HonoEndpointChain<"delete">;
  get: HonoEndpointChain<"get">;
  patch: HonoEndpointChain<"patch">;
  post: HonoEndpointChain<"post">;
  put: HonoEndpointChain<"put">;
  on<Self>(this: Self, method: string, path: string, ...handlers: [...UntypedHandler[], OpenAPIRouteClass]): Self;
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

// Endpoint instances that validated the request in chanfanaValidator(), per request context and route registration
const prevalidatedRoutes = new WeakMap<Context, Map<ValidatorRegistration, OpenAPIRoute>>();

/** Hono validation targets filled by chanfanaValidator(), mapped to chanfana's validated data keys. */
const VALIDATED_TARGETS = [
  ["json", "body"],
  ["query", "query"],
  ["param", "params"],
  ["header", "headers"],
] as const;

export class HonoOpenAPIHandler extends OpenAPIHandler {
  protected override get routerHandlesBasePrefix(): boolean {
    return true;
  }

  /**
   * Wraps route handlers to catch chanfana errors (ApiException)
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

  protected override bindValidator(createEndpoint: () => OpenAPIRoute): unknown {
    // Uses wrapHandler() so that validation errors reach Hono exactly like errors thrown by the endpoint
    const validate = this.wrapHandler(async (...args) => {
      const c = args[0] as Context;
      const route = createEndpoint();
      const errorResponse = await route.prevalidate(c);
      if (errorResponse) {
        return errorResponse;
      }

      const data: Record<string, unknown> = route.validatedData ?? {};
      for (const [target, key] of VALIDATED_TARGETS) {
        if (data[key] !== undefined) {
          c.req.addValidatedData(target, data[key] as Record<string, unknown>);
        }
      }
      const registration = this.validatorRegistrations.get(route.params);
      if (registration) {
        let routes = prevalidatedRoutes.get(c);
        if (routes === undefined) {
          routes = new Map();
          prevalidatedRoutes.set(c, routes);
        }
        routes.set(registration, route);
      }
      // No response: the middleware below continues the chain
      return undefined as unknown as Response;
    });

    return async (c: Context, next: () => Promise<void>) => {
      const errorResponse = await validate(c);
      if (errorResponse) {
        return errorResponse;
      }
      await next();
      return undefined;
    };
  }

  override getPrevalidatedData(args: unknown[], route: OpenAPIRoute): PrevalidatedData | undefined {
    const c = args[0];
    if (typeof c !== "object" || c === null) {
      return undefined;
    }

    // Only the endpoint of the registration whose marker validated the request reuses the data, once
    const registration = this.validatorRegistrations.get(route.params);
    const routes = prevalidatedRoutes.get(c as Context);
    const prevalidated = registration ? routes?.get(registration) : undefined;
    if (registration === undefined || prevalidated === undefined) {
      return undefined;
    }
    routes?.delete(registration);

    return { validatedData: prevalidated.validatedData, unvalidatedData: prevalidated.unvalidatedData };
  }

  override readJsonBody(args: unknown[], route: OpenAPIRoute): Promise<unknown> {
    // Hono caches the body read by c.req.json(), so other middleware can still read it after chanfanaValidator()
    if (this.validatorRegistrations.has(route.params)) {
      return (args[0] as Context).req.json();
    }
    return super.readJsonBody(args, route);
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

/**
 * Marks where chanfana validates the request in a Hono route's middleware chain. Middleware placed after it can read
 * the endpoint's validated, typed request data with `c.req.valid("json" | "query" | "param" | "header")`, and the
 * endpoint reuses that data instead of validating the request again.
 *
 * Only works on routes registered through `fromHono()`, placed before the endpoint class:
 *
 * @example
 * ```typescript
 * openapi.post("/users", authMiddleware, chanfanaValidator(), (c, next) => {
 *   const body = c.req.valid("json"); // typed from CreateUser's schema
 *   return next();
 * }, CreateUser);
 * ```
 */
// oxlint-disable-next-line typescript/no-explicit-any, typescript/no-empty-object-type -- the marker fits any route's Env/path, and adds no input itself
export function chanfanaValidator(): MiddlewareHandler<any, any, {}> & { readonly [CHANFANA_VALIDATOR]: true } {
  const marker = async () => {
    throw new Error(
      "chanfanaValidator() was called outside of a chanfana route. Register it in a route of a fromHono() router, " +
        "before the endpoint class: openapi.post(path, chanfanaValidator(), Endpoint)",
    );
  };
  return Object.assign(marker, { [CHANFANA_VALIDATOR]: true as const });
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

          if (prop === "all" && isRouteLike(handlers[handlers.length - 1])) {
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
          } else if (isValidatorMarker(route) || handlers.some(isValidatorMarker)) {
            throw new Error(
              `chanfanaValidator() is not supported in ${prop}(), use it in a route registration (get, post, put, ` +
                `patch, delete, all or on), placed before an OpenAPIRoute endpoint class`,
            );
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
