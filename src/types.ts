import type { RouteConfig, ZodMediaTypeObject } from "@asteasolutions/zod-to-openapi";
import type { HeadersObject as HeadersObject30, LinksObject as LinksObject30, OpenAPIObject } from "openapi3-ts/oas30";
import type { HeadersObject as HeadersObject31, LinksObject as LinksObject31 } from "openapi3-ts/oas31";
import type { AnyZodObject, ZodEffects, ZodType, z } from "zod";

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

export type IsEqual<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;

type Filter<KeyType, ExcludeType> = IsEqual<KeyType, ExcludeType> extends true
  ? never
  : KeyType extends ExcludeType
    ? never
    : KeyType;

type ExceptOptions = {
  requireExactProps?: boolean;
};

export type Except<
  ObjectType,
  KeysType extends keyof ObjectType,
  Options extends ExceptOptions = { requireExactProps: false },
> = {
  [KeyType in keyof ObjectType as Filter<KeyType, KeysType>]: ObjectType[KeyType];
} & (Options["requireExactProps"] extends true ? Partial<Record<KeysType, never>> : {});

export type SetOptional<BaseType, Keys extends keyof BaseType> = Simplify<
  // Pick just the keys that are readonly from the base type.
  Except<BaseType, Keys> &
    // Pick the keys that should be mutable from the base type and make them mutable.
    Partial<Pick<BaseType, Keys>>
>;

export type SetRequired<BaseType, Keys extends keyof BaseType> = BaseType extends unknown
  ? Simplify<
      // Pick just the keys that are optional from the base type.
      Except<BaseType, Keys> &
        // Pick the keys that should be required from the base type and make them required.
        Required<Pick<BaseType, Keys>>
    >
  : never;

// The following types are copied from @asteasolutions/zod-to-openapi as they are not exported
export type OpenAPIObjectConfig = Omit<OpenAPIObject, "paths" | "components" | "webhooks">;
export type OpenAPIObjectConfigV31 = Omit<OpenAPIObject, "paths" | "components" | "webhooks">;

type HeadersObject = HeadersObject30 | HeadersObject31;
type LinksObject = LinksObject30 | LinksObject31;

export type ZodMediaType = "application/json" | "text/html" | "text/plain" | "application/xml" | (string & {});
export type ZodContentObject = Partial<Record<ZodMediaType, ZodMediaTypeObject>>;
export interface ZodRequestBody {
  description?: string;
  content: ZodContentObject;
  required?: boolean;
}
export interface ResponseConfig {
  description: string;
  headers?: AnyZodObject | HeadersObject;
  links?: LinksObject;
  content?: ZodContentObject;
}
export type RouteParameter = AnyZodObject | ZodEffects<AnyZodObject, unknown, unknown> | undefined;

export interface RouterOptions {
  base?: string;
  schema?: Partial<OpenAPIObjectConfigV31 | OpenAPIObjectConfig>;
  docs_url?: string | null;
  redoc_url?: string | null;
  openapi_url?: string | null;
  raiseUnknownParameters?: boolean;
  generateOperationIds?: boolean;
  openapiVersion?: "3" | "3.1";
}

export interface RouteOptions {
  router: any;
  raiseUnknownParameters: boolean;
  route: string;
  urlParams: Array<string>;
}

export interface ParameterType {
  default?: string | number | boolean;
  description?: string;
  example?: string | number | boolean;
  required?: boolean;
  deprecated?: boolean;
}

export interface StringParameterType extends ParameterType {
  format?: string;
}

export interface EnumerationParameterType extends StringParameterType {
  values: Record<string, any>;
  enumCaseSensitive?: boolean;
}

export interface RegexParameterType extends StringParameterType {
  pattern: RegExp;
  patternError?: string;
}

export type RequestTypes = {
  body?: ZodRequestBody;
  params?: AnyZodObject;
  query?: AnyZodObject;
  cookies?: AnyZodObject;
  headers?: AnyZodObject | ZodType<unknown>[];
};

// Changes over the original RouteConfig:
// - Make responses optional (a default one is generated)
// - Removes method and path (its inject on boot)
export type OpenAPIRouteSchema = Simplify<
  Omit<RouteConfig, "responses" | "method" | "path" | "request"> & {
    request?: RequestTypes;
    responses?: {
      [statusCode: string]: ResponseConfig;
    };
  }
>;

export type ValidatedData<S> = S extends OpenAPIRouteSchema
  ? {
      query: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetOutput<GetRequest<S>, "query"> : undefined;
      params: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetOutput<GetRequest<S>, "params"> : undefined;
      headers: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetOutput<GetRequest<S>, "headers"> : undefined;
      body: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetBody<GetPartBody<GetRequest<S>, "body">> : undefined;
    }
  : {
      query: undefined;
      params: undefined;
      headers: undefined;
      body: undefined;
    };

type GetRequest<T extends OpenAPIRouteSchema> = T["request"];

type GetOutput<T extends object | undefined, P extends keyof T> = T extends NonNullable<T>
  ? T[P] extends AnyZodObject
    ? z.output<T[P]>
    : undefined
  : undefined;

type GetPartBody<T extends RequestTypes, P extends keyof T> = T[P] extends ZodRequestBody ? T[P] : undefined;

type GetBody<T extends ZodRequestBody | undefined> = T extends NonNullable<T>
  ? T["content"]["application/json"] extends NonNullable<T["content"]["application/json"]>
    ? T["content"]["application/json"]["schema"] extends z.ZodTypeAny
      ? z.output<T["content"]["application/json"]["schema"]>
      : undefined
    : undefined
  : undefined;
