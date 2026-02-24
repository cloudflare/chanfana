import { OpenApiGeneratorV3, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import yaml from "js-yaml";
import { z } from "zod";
import type { OpenAPIRouteSchema, RouterOptions } from "./types";
import { getReDocUI, getSwaggerUI } from "./ui";
import { validateBasePath } from "./utils";
import { OpenAPIRegistryMerger } from "./zod/registry";

export type OpenAPIRouterType<M> = {
  original: M;
  options: RouterOptions;
  registry: OpenAPIRegistryMerger;
  schema: any;
};

/**
 * Valid HTTP methods for OpenAPI routes.
 * These are the standard methods supported by the OpenAPI specification.
 */
export type HttpMethod = "get" | "head" | "post" | "put" | "delete" | "patch";

/**
 * Handles the generation of OpenAPI schema and serves the documentation UI.
 *
 * Paths defined with `x-ignore: true` in their `OpenAPIRouteSchema`
 * will be excluded from the generated OpenAPI specification by the CLI tool.
 */
export class OpenAPIHandler {
  router: any;
  options: RouterOptions;
  registry: OpenAPIRegistryMerger;

  allowedMethods: string[] = ["get", "head", "post", "put", "delete", "patch"];

  /**
   * When true, the underlying router handles base path prefixing for route
   * registration (e.g. Hono's basePath()). Doc route paths will be registered
   * without the base prefix since the router adds it automatically.
   * The base is still used for schema generation and HTML references.
   *
   * This is a getter (not a field) so that subclass overrides take effect
   * even when accessed during the base class constructor (createDocsRoutes).
   */
  protected get routerHandlesBasePrefix(): boolean {
    return false;
  }

  /**
   * Hook for adapters to wrap route handler functions.
   * Called for each OpenAPIRoute handler during route registration.
   * The base implementation returns the handler as-is.
   * Subclasses (e.g. HonoOpenAPIHandler) can override this to add
   * error conversion or other adapter-specific behavior.
   */
  protected wrapHandler(handler: (...args: any[]) => Promise<Response>): (...args: any[]) => Promise<Response> {
    return handler;
  }

  constructor(router: any, options?: RouterOptions) {
    if (!router) {
      throw new Error("Router is required");
    }

    if (options?.base) {
      validateBasePath(options.base);
    }

    this.router = router;
    this.options = options || {};
    this.registry = new OpenAPIRegistryMerger();

    this.createDocsRoutes();
  }

  /**
   * Creates the documentation routes for Swagger UI, ReDoc, and OpenAPI JSON/YAML.
   * Respects the base path configuration for consistent URL generation.
   */
  createDocsRoutes() {
    const base = this.options?.base || "";
    const openapiUrl = this.options?.openapi_url || "/openapi.json";

    // When routerHandlesBasePrefix is true (e.g. Hono with basePath()),
    // the router adds the base prefix to routes automatically, so we skip it
    // in route registration paths. The full base+url is still used in HTML
    // content so the browser can resolve the correct URL.
    const routeBase = this.routerHandlesBasePrefix ? "" : base;

    const docsDisabled = this.options?.docs_url === null;
    const redocDisabled = this.options?.redoc_url === null;
    const openapiDisabled = this.options?.openapi_url === null;

    // Note: /docs and /redocs routes intentionally don't use routeBase.
    // When routerHandlesBasePrefix is true (Hono), the router's basePath()
    // already prefixes all registered routes automatically. When false
    // (itty-router), doc routes have never been prefixed with base — this
    // is pre-existing behavior. Only openapi.json/yaml use routeBase because
    // itty-router needs the explicit prefix for schema endpoints.

    // Swagger UI docs route
    if (!docsDisabled && !openapiDisabled) {
      const docsPath = this.options?.docs_url || "/docs";
      this.router.get(docsPath, () => {
        return new Response(getSwaggerUI(base + openapiUrl), {
          headers: {
            "content-type": "text/html; charset=UTF-8",
          },
          status: 200,
        });
      });
    }

    // ReDoc docs route
    if (!redocDisabled && !openapiDisabled) {
      const redocPath = this.options?.redoc_url || "/redocs";
      this.router.get(redocPath, () => {
        return new Response(getReDocUI(base + openapiUrl), {
          headers: {
            "content-type": "text/html; charset=UTF-8",
          },
          status: 200,
        });
      });
    }

    // OpenAPI JSON and YAML endpoints
    if (!openapiDisabled) {
      // JSON endpoint
      this.router.get(routeBase + openapiUrl, () => {
        return new Response(JSON.stringify(this.getGeneratedSchema()), {
          headers: {
            "content-type": "application/json;charset=UTF-8",
          },
          status: 200,
        });
      });

      // YAML endpoint - use proper regex to only replace trailing .json
      const yamlUrl = openapiUrl.replace(/\.json$/, ".yaml");
      this.router.get(routeBase + yamlUrl, () => {
        return new Response(yaml.dump(this.getGeneratedSchema()), {
          headers: {
            "content-type": "text/yaml;charset=UTF-8",
          },
          status: 200,
        });
      });
    }
  }

  /**
   * Generates the OpenAPI schema document from registered routes.
   * @returns The complete OpenAPI specification object
   */
  getGeneratedSchema() {
    const GeneratorClass = this.options?.openapiVersion === "3" ? OpenApiGeneratorV3 : OpenApiGeneratorV31;
    const generator = new GeneratorClass(this.registry.definitions);

    return generator.generateDocument({
      openapi: this.options?.openapiVersion === "3" ? "3.0.3" : "3.1.0",
      info: {
        version: this.options?.schema?.info?.version || "1.0.0",
        title: this.options?.schema?.info?.title || "OpenAPI",
        ...this.options?.schema?.info,
      },
      ...this.options?.schema,
    });
  }

  /**
   * Registers a nested router and merges its OpenAPI registry.
   * @param params - Nested router parameters
   * @returns Array containing the nested router's fetch handler
   */
  registerNestedRouter(params: { method: string; nestedRouter: any; path?: string }) {
    // Only overwrite the path if the nested router doesn't have a base already
    const path = params.nestedRouter.options?.base
      ? undefined
      : params.path
        ? ((this.options.base || "") + params.path)
            .replaceAll(/\/+(\/|$)/g, "$1") // strip double & trailing slash
            .replaceAll(/:(\w+)/g, "{$1}") // convert parameters into openapi compliant
        : undefined;

    this.registry.merge(params.nestedRouter.registry, path);

    return [params.nestedRouter.fetch];
  }

  /**
   * Parses a route path, applying base path and converting to OpenAPI format.
   * @param path - The route path to parse
   * @returns The parsed and formatted path
   */
  parseRoute(path: string): string {
    return ((this.options.base || "") + path)
      .replaceAll(/\/+(\/|$)/g, "$1") // strip double & trailing slash
      .replaceAll(/:(\w+)/g, "{$1}"); // convert parameters into openapi compliant
  }

  /**
   * Sanitizes an operationId to ensure it's valid for OpenAPI.
   * @param operationId - The raw operationId
   * @returns A sanitized operationId
   */
  private sanitizeOperationId(operationId: string): string {
    return (
      operationId
        .replace(/[{}]/g, "") // Remove curly braces
        .replace(/\/+/g, "_") // Replace slashes with underscores
        .replace(/^_+|_+$/g, "") // Trim leading/trailing underscores
        .replace(/_+/g, "_") || // Collapse multiple underscores
      "root"
    ); // Fallback for empty result
  }

  /**
   * Registers a route with the OpenAPI registry.
   * @param params - Route registration parameters
   * @returns Array of wrapped handlers
   */
  registerRoute(params: { method: string; path: string; handlers: any[]; doRegister?: boolean }) {
    const parsedRoute = this.parseRoute(params.path);

    const parsedParams = ((this.options.base || "") + params.path).match(/:(\w+)/g);
    let urlParams: string[] = [];
    if (parsedParams) {
      urlParams = parsedParams.map((obj) => obj.replace(":", ""));
    }

    let schema: OpenAPIRouteSchema | undefined;
    let operationId: string | undefined;

    for (const handler of params.handlers) {
      if (handler.name) {
        operationId = this.sanitizeOperationId(`${params.method}_${handler.name}`);
      }

      if (handler.isRoute === true) {
        schema = new handler({
          route: parsedRoute,
          urlParams: urlParams,
        }).getSchemaZod();
        break;
      }
    }

    if (operationId === undefined) {
      operationId = this.sanitizeOperationId(`${params.method}_${parsedRoute}`);
    }

    if (schema === undefined) {
      // No schema for this route, try to guess the parameters
      schema = {
        operationId: operationId,
        responses: {
          200: {
            description: "Successful response.",
          },
        },
      };

      if (urlParams.length > 0) {
        schema.request = {
          params: z.object(
            urlParams.reduce(
              (obj, item) =>
                Object.assign(obj, {
                  [item]: z.string(),
                }),
              {},
            ),
          ),
        };
      }
    } else {
      // Schema was provided in the endpoint
      if (!schema.operationId) {
        if (this.options?.generateOperationIds === false) {
          throw new Error(`Route ${params.path} doesn't have operationId set!`);
        }
        schema.operationId = operationId;
      }
    }

    if (params.doRegister === undefined || params.doRegister) {
      this.registry.registerPath({
        ...schema,
        // @ts-expect-error - method type is more restrictive in the library
        method: params.method,
        path: parsedRoute,
      });
    }

    return params.handlers.map((handler: any) => {
      if (handler.isRoute) {
        const fn = (...params: any[]) =>
          new handler({
            router: this,
            route: parsedRoute,
            urlParams: urlParams,
            raiseOnError: this.options?.raiseOnError,
            raiseUnknownParameters: this.options?.raiseUnknownParameters,
          }).execute(...params);
        return this.wrapHandler(fn);
      }

      return handler;
    });
  }

  /**
   * Handles common proxy properties for the wrapped router.
   * Provides access to isChanfana flag, original router, schema, and registry.
   */
  handleCommonProxy(_target: any, prop: string, ..._args: any[]) {
    // This is a hack to allow older versions of wrangler to use this library
    // https://github.com/cloudflare/workers-sdk/issues/5420
    if (prop === "middleware") {
      return [];
    }

    if (prop === "isChanfana") {
      return true;
    }
    if (prop === "original") {
      return this.router;
    }
    if (prop === "schema") {
      return this.getGeneratedSchema();
    }
    if (prop === "registry") {
      return this.registry;
    }
    if (prop === "options") {
      return this.options;
    }

    return undefined;
  }

  /**
   * Gets the Request object from handler arguments.
   * Must be implemented by subclasses.
   * @param _args - Handler arguments
   */
  getRequest(_args: any[]): Request {
    throw new Error("getRequest not implemented");
  }

  /**
   * Gets URL parameters from handler arguments.
   * Must be implemented by subclasses.
   * @param _args - Handler arguments
   */
  getUrlParams(_args: any[]): Record<string, any> {
    throw new Error("getUrlParams not implemented");
  }

  /**
   * Gets environment bindings from handler arguments.
   * Must be implemented by subclasses.
   * @param _args - Handler arguments
   */
  getBindings(_args: any[]): Record<string, any> {
    throw new Error("getBindings not implemented");
  }
}
