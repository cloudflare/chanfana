import * as _asteasolutions_zod_to_openapi from '@asteasolutions/zod-to-openapi';
import { ZodMediaTypeObject, RouteConfig, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
export { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import * as zod from 'zod';
import { AnyZodObject, ZodEffects, ZodType, z } from 'zod';
import * as openapi3_ts_oas30 from 'openapi3-ts/oas30';
import { OpenAPIObject, HeadersObject as HeadersObject$1, LinksObject as LinksObject$1 } from 'openapi3-ts/oas30';
import * as openapi3_ts_oas31 from 'openapi3-ts/oas31';
import { HeadersObject as HeadersObject$2, LinksObject as LinksObject$2 } from 'openapi3-ts/oas31';

type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
type OpenAPIObjectConfig = Omit<OpenAPIObject, "paths" | "components" | "webhooks">;
type OpenAPIObjectConfigV31 = Omit<OpenAPIObject, "paths" | "components" | "webhooks">;
type HeadersObject = HeadersObject$1 | HeadersObject$2;
type LinksObject = LinksObject$1 | LinksObject$2;
type ZodMediaType = "application/json" | "text/html" | "text/plain" | "application/xml" | (string & {});
type ZodContentObject = Partial<Record<ZodMediaType, ZodMediaTypeObject>>;
interface ZodRequestBody {
    description?: string;
    content: ZodContentObject;
    required?: boolean;
}
interface ResponseConfig {
    description: string;
    headers?: AnyZodObject | HeadersObject;
    links?: LinksObject;
    content?: ZodContentObject;
}
type RouteParameter = AnyZodObject | ZodEffects<AnyZodObject, unknown, unknown> | undefined;
interface RouterOptions {
    base?: string;
    schema?: Partial<OpenAPIObjectConfigV31 | OpenAPIObjectConfig>;
    docs_url?: string | null;
    redoc_url?: string | null;
    openapi_url?: string | null;
    raiseUnknownParameters?: boolean;
    generateOperationIds?: boolean;
    openapiVersion?: "3" | "3.1";
    docsPageTitle?: string | null;
}
interface RouteOptions {
    router: any;
    raiseUnknownParameters: boolean;
}
interface ParameterType {
    default?: string | number | boolean;
    description?: string;
    example?: string | number | boolean;
    required?: boolean;
    deprecated?: boolean;
}
interface StringParameterType extends ParameterType {
    format?: string;
}
interface EnumerationParameterType extends StringParameterType {
    values: Record<string, any>;
    enumCaseSensitive?: boolean;
}
interface RegexParameterType extends StringParameterType {
    pattern: RegExp;
    patternError?: string;
}
type RequestTypes = {
    body?: ZodRequestBody;
    params?: AnyZodObject;
    query?: AnyZodObject;
    cookies?: AnyZodObject;
    headers?: AnyZodObject | ZodType<unknown>[];
};
type OpenAPIRouteSchema = Simplify<Omit<RouteConfig, "responses" | "method" | "path" | "request"> & {
    request?: RequestTypes;
    responses?: {
        [statusCode: string]: ResponseConfig;
    };
}>;
type ValidatedData<S> = S extends OpenAPIRouteSchema ? {
    query: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetOutput<GetRequest<S>, "query"> : undefined;
    params: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetOutput<GetRequest<S>, "params"> : undefined;
    headers: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetOutput<GetRequest<S>, "headers"> : undefined;
    body: GetRequest<S> extends NonNullable<GetRequest<S>> ? GetBody<GetPartBody<GetRequest<S>, "body">> : undefined;
} : {
    query: undefined;
    params: undefined;
    headers: undefined;
    body: undefined;
};
type GetRequest<T extends OpenAPIRouteSchema> = T["request"];
type GetOutput<T extends object | undefined, P extends keyof T> = T extends NonNullable<T> ? T[P] extends AnyZodObject ? z.output<T[P]> : undefined : undefined;
type GetPartBody<T extends RequestTypes, P extends keyof T> = T[P] extends ZodRequestBody ? T[P] : undefined;
type GetBody<T extends ZodRequestBody | undefined> = T extends NonNullable<T> ? T["content"]["application/json"] extends NonNullable<T["content"]["application/json"]> ? T["content"]["application/json"]["schema"] extends z.ZodTypeAny ? z.output<T["content"]["application/json"]["schema"]> : undefined : undefined : undefined;

declare class OpenAPIRoute {
    handle(...args: any[]): Response | Promise<Response> | object | Promise<object>;
    static isRoute: boolean;
    args: any[];
    validatedData: any;
    params: RouteOptions;
    schema: OpenAPIRouteSchema;
    constructor(params: RouteOptions);
    getValidatedData<S = any>(): Promise<ValidatedData<S>>;
    getSchema(): OpenAPIRouteSchema;
    getSchemaZod(): OpenAPIRouteSchema;
    handleValidationError(errors: z.ZodIssue[]): Response;
    execute(...args: any[]): Promise<Response>;
    validateRequest(request: Request): Promise<any>;
}

declare class OpenAPIRegistryMerger extends OpenAPIRegistry {
    _definitions: object[];
    merge(registry: OpenAPIRegistryMerger): void;
}

type OpenAPIRouterType<M> = {
    original: M;
    options: RouterOptions;
    registry: OpenAPIRegistryMerger;
    delete(path: string, endpoint: typeof OpenAPIRoute): M;
    get(path: string, endpoint: typeof OpenAPIRoute): M;
    head(path: string, endpoint: typeof OpenAPIRoute): M;
    patch(path: string, endpoint: typeof OpenAPIRoute): M;
    post(path: string, endpoint: typeof OpenAPIRoute): M;
    put(path: string, endpoint: typeof OpenAPIRoute): M;
    all(path: string, router: M): M;
};
declare class OpenAPIHandler {
    router: any;
    options: RouterOptions;
    registry: OpenAPIRegistryMerger;
    allowedMethods: string[];
    constructor(router: any, options?: RouterOptions);
    createDocsRoutes(): void;
    getGeneratedSchema(): any;
    registerNestedRouter(params: {
        method: string;
        path: string;
        nestedRouter: any;
    }): any[];
    parseRoute(path: string): string;
    registerRoute(params: {
        method: string;
        path: string;
        handlers: any[];
    }): any[];
    handleCommonProxy(target: any, prop: string, ...args: any[]): any;
    getRequest(args: any[]): void;
    getUrlParams(args: any[]): Record<string, any>;
}

declare function convertParams<M = z.ZodType>(field: any, params: any): M;
declare function Arr(innerType: any, params?: ParameterType): z.ZodArray<any>;
declare function Obj(fields: object, params?: ParameterType): z.ZodObject<any>;
declare function Num(params?: ParameterType): z.ZodNumber;
declare function Int(params?: ParameterType): z.ZodNumber;
declare function Str(params?: ParameterType): z.ZodString;
declare function DateTime(params?: ParameterType): z.ZodString;
declare function Regex(params: RegexParameterType): z.ZodString;
declare function Email(params?: ParameterType): z.ZodString;
declare function Uuid(params?: ParameterType): z.ZodString;
declare function Hostname(params?: ParameterType): z.ZodString;
declare function Ipv4(params?: ParameterType): z.ZodString;
declare function Ipv6(params?: ParameterType): z.ZodString;
declare function Ip(params?: ParameterType): z.ZodString;
declare function DateOnly(params?: ParameterType): z.ZodString;
declare function Bool(params?: ParameterType): z.ZodBoolean;
declare function Enumeration(params: EnumerationParameterType): z.ZodEnum<any>;
declare function coerceInputs(data: Record<string, any>, schema?: RouteParameter): Record<string, any> | null;

declare function getSwaggerUI(schemaUrl: string, docsPageTitle: string): string;
declare function getReDocUI(schemaUrl: string, docsPageTitle: string): string;

declare function jsonResp(data: any, params?: object): Response;

type JsonContent<T> = {
    content: {
        "application/json": {
            schema: z.ZodType<T>;
        };
    };
};
type InferSchemaType<T> = T extends z.ZodType ? z.infer<T> : T;
declare const contentJson: <T>(schema: T) => JsonContent<InferSchemaType<T>>;

declare class IttyRouterOpenAPIHandler extends OpenAPIHandler {
    getRequest(args: any[]): any;
    getUrlParams(args: any[]): Record<string, any>;
}
declare function fromIttyRouter<M>(router: M, options?: RouterOptions): M & OpenAPIRouterType<M>;

declare class HonoOpenAPIHandler extends OpenAPIHandler {
    getRequest(args: any[]): any;
    getUrlParams(args: any[]): Record<string, any>;
}
declare function fromHono<M>(router: M, options?: RouterOptions): M & OpenAPIRouterType<M>;

declare function isAnyZodType(schema: object): schema is z.ZodType;
declare function isSpecificZodType(field: any, typeName: string): boolean;
declare function legacyTypeIntoZod(type: any, params?: any): z.ZodType;

declare class ApiException extends Error {
    isVisible: boolean;
    message: string;
    default_message: string;
    status: number;
    code: number;
    includesPath: boolean;
    constructor(message?: string);
    buildResponse(): {
        code: number;
        message: string;
    }[];
    static schema(): {
        [x: number]: {
            content: {
                "application/json": {
                    schema: zod.ZodType<{
                        success: boolean;
                        errors: {
                            code: number;
                            message: string;
                        }[];
                    }, zod.ZodTypeDef, {
                        success: boolean;
                        errors: {
                            code: number;
                            message: string;
                        }[];
                    }>;
                };
            };
            description: string;
        };
    };
}
declare class InputValidationException extends ApiException {
    isVisible: boolean;
    default_message: string;
    status: number;
    code: number;
    path: null;
    includesPath: boolean;
    constructor(message?: string, path?: any);
    buildResponse(): {
        code: number;
        message: string;
        path: null;
    }[];
}
declare class MultiException extends Error {
    isVisible: boolean;
    errors: Array<ApiException>;
    status: number;
    constructor(errors: Array<ApiException>);
    buildResponse(): ({
        code: number;
        message: string;
    } | undefined)[];
}
declare class NotFoundException extends ApiException {
    isVisible: boolean;
    default_message: string;
    status: number;
    code: number;
}

type FilterCondition = {
    field: string;
    operator: string;
    value: string | number | boolean | null;
};
type ListFilters = {
    filters: Array<FilterCondition>;
    options: {
        page?: number;
        per_page?: number;
        order_by?: string;
        order_by_direction?: "asc" | "desc";
    };
};
type Filters = {
    filters: Array<FilterCondition>;
};
type UpdateFilters = {
    filters: Array<FilterCondition>;
    updatedData: Record<string, any>;
};

declare class UpdateEndpoint extends OpenAPIRoute {
    model: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    primaryKey?: Array<string>;
    pathParameters?: Array<string>;
    serializer: (obj: object) => object;
    getSchema(): {
        servers?: openapi3_ts_oas30.ServerObject[] | undefined;
        security?: openapi3_ts_oas30.SecurityRequirementObject[] | openapi3_ts_oas31.SecurityRequirementObject[] | undefined;
        tags?: string[] | undefined;
        externalDocs?: openapi3_ts_oas30.ExternalDocumentationObject | openapi3_ts_oas31.ExternalDocumentationObject | undefined;
        deprecated?: boolean | undefined;
        description?: string | undefined;
        summary?: string | undefined;
        operationId?: string | undefined;
        parameters?: (openapi3_ts_oas30.ParameterObject | openapi3_ts_oas30.ReferenceObject)[] | (openapi3_ts_oas31.ParameterObject | openapi3_ts_oas31.ReferenceObject)[] | undefined;
        requestBody?: openapi3_ts_oas30.ReferenceObject | openapi3_ts_oas31.ReferenceObject | openapi3_ts_oas30.RequestBodyObject | openapi3_ts_oas31.RequestBodyObject | undefined;
        callbacks?: openapi3_ts_oas30.CallbacksObject | openapi3_ts_oas31.CallbacksObject | undefined;
        request: RequestTypes | {
            body: ZodRequestBody | {
                content: {
                    "application/json": {
                        schema: z.ZodType<{}, z.ZodTypeDef, {}>;
                    };
                };
            };
            params: z.AnyZodObject | z.ZodObject<Pick<{}, never>, "strip", z.ZodTypeAny, {}, {}>;
            query?: z.AnyZodObject;
            cookies?: z.AnyZodObject;
            headers?: z.AnyZodObject | z.ZodType<unknown>[];
        };
        responses: {
            [statusCode: string]: ResponseConfig;
        } | {
            "200": {
                description: string;
                headers?: z.AnyZodObject | (openapi3_ts_oas30.HeadersObject | openapi3_ts_oas31.HeadersObject);
                links?: openapi3_ts_oas30.LinksObject | openapi3_ts_oas31.LinksObject;
                content: Partial<Record<ZodMediaType, _asteasolutions_zod_to_openapi.ZodMediaTypeObject>> | {
                    "application/json": {
                        schema: z.ZodType<{
                            success: BooleanConstructor;
                            result: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
                        }, z.ZodTypeDef, {
                            success: BooleanConstructor;
                            result: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
                        }>;
                    };
                };
            };
        };
    };
    getFilters(): Promise<UpdateFilters>;
    before(oldObj: object, filters: UpdateFilters): Promise<UpdateFilters>;
    after(data: object): Promise<object>;
    getObject(filters: UpdateFilters): Promise<object | null>;
    update(oldObj: object, filters: UpdateFilters): Promise<object>;
    handle(...args: any[]): Promise<{
        success: boolean;
        result: object;
    }>;
}

export { ApiException, Arr, Bool, DateOnly, DateTime, Email, Enumeration, type EnumerationParameterType, type FilterCondition, type Filters, HonoOpenAPIHandler, Hostname, InputValidationException, Int, Ip, Ipv4, Ipv6, IttyRouterOpenAPIHandler, type ListFilters, MultiException, NotFoundException, Num, Obj, OpenAPIHandler, type OpenAPIObjectConfig, type OpenAPIObjectConfigV31, OpenAPIRegistryMerger, OpenAPIRoute, type OpenAPIRouteSchema, type OpenAPIRouterType, type ParameterType, Regex, type RegexParameterType, type RequestTypes, type ResponseConfig, type RouteOptions, type RouteParameter, type RouterOptions, type Simplify, Str, type StringParameterType, UpdateEndpoint, type UpdateFilters, Uuid, type ValidatedData, type ZodContentObject, type ZodMediaType, type ZodRequestBody, coerceInputs, contentJson, convertParams, fromHono, fromIttyRouter, getReDocUI, getSwaggerUI, isAnyZodType, isSpecificZodType, jsonResp, legacyTypeIntoZod };
