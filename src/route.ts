import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { InputValidationException, MultiException, ResponseValidationException } from "./exceptions";
import { coerceInputs } from "./parameters";
import type { AnyZodObject, OpenAPIRouteSchema, RouteOptions, ValidatedData } from "./types";
import { formatChanfanaError, jsonResp } from "./utils";

extendZodWithOpenApi(z);

/**
 * Base class for all OpenAPI route handlers.
 * Provides request validation, error handling, and response formatting.
 *
 * @template HandleArgs - Router handler arguments type
 */
export class OpenAPIRoute<HandleArgs extends Array<object> = any> {
  /**
   * The main handler method to be implemented by subclasses.
   * @param _args - Handler arguments (context, request, etc. depending on router)
   * @returns Response object or plain object (will be auto-converted to JSON)
   */
  handle(..._args: any[]): Response | Promise<Response> | object | Promise<object> {
    throw new Error("Method not implemented.");
  }

  static isRoute = true;

  /** Args the execute() was called with */
  args: HandleArgs;
  /** Cache for validated data - prevents re-validation on multiple calls */
  validatedData: any = undefined;
  /** Cache for raw request data before Zod applies defaults/transformations */
  unvalidatedData: any = undefined;
  /** Route configuration options */
  params: RouteOptions;
  /** OpenAPI schema definition for this route */
  schema: OpenAPIRouteSchema = {};

  constructor(params: RouteOptions) {
    this.params = params;
    this.args = [] as any;
  }

  /**
   * Gets validated request data, validating the request if not already done.
   * Results are cached for subsequent calls.
   *
   * @returns Validated data including params, query, headers, and body
   */
  async getValidatedData<S = any>(): Promise<ValidatedData<S>> {
    const request = this.params.router.getRequest(this.args);

    if (this.validatedData !== undefined) return this.validatedData;

    const data = await this.validateRequest(request);

    this.validatedData = data;
    return data;
  }

  /**
   * Gets raw request data before Zod validation/transformation.
   * Useful for checking which fields were actually sent in the request,
   * especially when using Zod 4 with optional fields that have defaults.
   *
   * @returns Raw request data object
   */
  async getUnvalidatedData(): Promise<any> {
    if (this.unvalidatedData !== undefined) return this.unvalidatedData;

    const request = this.params.router.getRequest(this.args);
    const schema: OpenAPIRouteSchema = this.getSchemaZod();
    const unvalidatedData: any = {};

    if (schema.request?.params) {
      unvalidatedData.params = coerceInputs(this.params.router.getUrlParams(this.args), schema.request?.params);
    }

    const { searchParams } = new URL(request.url);
    if (schema.request?.query) {
      const queryParams = coerceInputs(searchParams, schema.request.query);
      unvalidatedData.query = queryParams ?? {};
    }

    if (schema.request?.headers) {
      const tmpHeaders: Record<string, string | null> = {};
      const rHeaders = new Headers(request.headers);
      for (const header of Object.keys((schema.request.headers as AnyZodObject).shape)) {
        tmpHeaders[header] = rHeaders.get(header);
      }
      unvalidatedData.headers = coerceInputs(tmpHeaders, schema.request.headers as AnyZodObject) ?? {};
    }

    // Only parse body for non-GET/HEAD requests with JSON content
    if (
      !["get", "head"].includes(request.method.toLowerCase()) &&
      schema.request?.body?.content?.["application/json"]?.schema
    ) {
      try {
        unvalidatedData.body = await request.json();
      } catch (_e) {
        // JSON parse error - store empty body and let Zod validation handle required fields
        unvalidatedData.body = {};
      }
    }

    this.unvalidatedData = unvalidatedData;
    return unvalidatedData;
  }

  /**
   * Returns the OpenAPI schema for this route.
   * Override this method to customize schema properties.
   */
  getSchema(): OpenAPIRouteSchema {
    return this.schema;
  }

  /**
   * Returns the schema with Zod types, adding default response if not provided.
   * Note: This creates a shallow copy - nested objects are still references.
   */
  getSchemaZod(): OpenAPIRouteSchema {
    // Shallow copy - nested objects are still references
    const schema = { ...this.getSchema() };

    if (!schema.responses) {
      // No response was provided in the schema, default to a blank one
      schema.responses = {
        "200": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: {},
            },
          },
        },
      };
    }

    return schema;
  }

  /**
   * Hook to transform errors thrown during handle().
   * Override this method to wrap, replace, or re-classify errors before
   * chanfana's default error formatting runs.
   *
   * The returned value is used for all subsequent error handling:
   * - If `raiseOnError` is true, the returned error is re-thrown (e.g. to Hono's onError).
   * - Otherwise, chanfana's `formatChanfanaError` is called on the returned error.
   *
   * @example
   * ```typescript
   * class MyRoute extends OpenAPIRoute {
   *   protected handleError(error: unknown): unknown {
   *     // Wrap ApiExceptions so they bypass chanfana's formatter
   *     // and reach Hono's onError handler directly
   *     if (error instanceof ApiException) {
   *       return new MyCustomError(error);
   *     }
   *     return error;
   *   }
   * }
   * ```
   *
   * @param error - The caught error
   * @returns The error (possibly transformed) to be handled by chanfana.
   *   Should be an Error instance. Returning non-Error values (null, strings, etc.)
   *   may produce confusing stack traces if the error is ultimately re-thrown.
   */
  protected handleError(error: unknown): unknown {
    return error;
  }

  /**
   * Main execution method called by the router.
   * Handles validation, error catching, and response formatting.
   *
   * Caches are reset on each execution to ensure request isolation.
   *
   * @param args - Handler arguments from the router
   * @returns Response object
   */
  async execute(...args: HandleArgs) {
    // Reset caches for request isolation
    this.validatedData = undefined;
    this.unvalidatedData = undefined;
    this.args = args;

    let resp;
    try {
      resp = await this.handle(...args);

      if (this.params?.validateResponse) {
        try {
          resp = await this.validateResponse(resp);
        } catch (validationError) {
          console.error("[chanfana] Response validation failed:", validationError);
          throw new ResponseValidationException();
        }
      }
    } catch (rawError) {
      if (this.params?.passthroughErrors) {
        throw rawError;
      }

      const e = this.handleError(rawError) ?? rawError;

      if (this.params?.raiseOnError) {
        throw e;
      }

      const errorResponse = formatChanfanaError(e);
      if (errorResponse) {
        return errorResponse;
      }

      throw e;
    }

    // Auto-convert plain objects to JSON responses
    if (resp !== null && resp !== undefined && !(resp instanceof Response) && typeof resp === "object") {
      return jsonResp(resp);
    }

    return resp;
  }

  /**
   * Finds the Zod schema for a response with the given status code.
   * Falls back to the "default" response if no exact match is found.
   * @param statusCode - HTTP status code to look up
   * @returns Zod schema for the response body, or undefined if not found
   */
  getResponseSchema(statusCode: number): z.ZodType | undefined {
    const schema = this.getSchemaZod();
    const responses = schema.responses;
    if (!responses) return undefined;

    const responseConfig = responses[String(statusCode)] ?? responses.default;
    if (!responseConfig) return undefined;

    const jsonContent = responseConfig.content?.["application/json"];
    if (!jsonContent?.schema) return undefined;

    // Skip non-Zod schemas (e.g. empty {} from default response)
    const zodSchema = jsonContent.schema;
    if (!(zodSchema instanceof z.ZodType)) return undefined;

    return zodSchema;
  }

  /**
   * Validates a response body against the response schema.
   * For plain objects, parses through Zod to strip unknown fields and validate types.
   * For Response objects with JSON content, clones the body, parses, and reconstructs
   * with corrected headers (Content-Length/Transfer-Encoding are removed).
   * Responses without a matching Zod schema (including non-JSON responses) are passed through unchanged.
   * @param resp - The response from handle()
   * @returns The validated/stripped response
   * @throws ZodError if the response body fails schema validation
   */
  async validateResponse(resp: any): Promise<any> {
    if (resp === null || resp === undefined) return resp;

    if (resp instanceof Response) {
      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return resp;

      const responseSchema = this.getResponseSchema(resp.status);
      if (!responseSchema) return resp;

      // Clone before consuming the body stream so the original remains readable on failure
      const cloned = resp.clone();
      const body = await cloned.json();
      const parsed = await responseSchema.parseAsync(body);

      // Reconstruct the Response with validated body and original status/headers.
      // Delete Content-Length and Transfer-Encoding since the body size may have changed
      // after stripping unknown fields.
      const newHeaders = new Headers(resp.headers);
      newHeaders.delete("content-length");
      newHeaders.delete("transfer-encoding");
      return new Response(JSON.stringify(parsed), {
        status: resp.status,
        statusText: resp.statusText,
        headers: newHeaders,
      });
    }

    if (typeof resp === "object") {
      // Plain objects are auto-converted to 200 JSON responses
      const responseSchema = this.getResponseSchema(200);
      if (!responseSchema) return resp;

      return await responseSchema.parseAsync(resp);
    }

    return resp;
  }

  /**
   * Validates the incoming request against the schema.
   * @param request - The incoming Request object
   * @returns Validated and typed request data
   * @throws ZodError if validation fails
   */
  async validateRequest(request: Request) {
    const schema: OpenAPIRouteSchema = this.getSchemaZod();

    // Get unvalidated data (this also stores it in this.unvalidatedData)
    const unvalidatedData = await this.getUnvalidatedData();

    const rawSchema: any = {};
    if (schema.request?.params) {
      rawSchema.params = schema.request.params;
    }
    if (schema.request?.query) {
      rawSchema.query = schema.request.query;
    }

    if (schema.request?.headers) {
      rawSchema.headers = schema.request.headers;
    }

    if (
      !["get", "head"].includes(request.method.toLowerCase()) &&
      schema.request?.body?.content?.["application/json"]?.schema
    ) {
      rawSchema.body = schema.request.body.content["application/json"].schema;
    }

    let validationSchema: any;

    if (this.params?.raiseUnknownParameters === undefined || this.params?.raiseUnknownParameters === true) {
      validationSchema = z.strictObject(rawSchema);
    } else {
      validationSchema = z.object(rawSchema);
    }

    try {
      return await validationSchema.parseAsync(unvalidatedData);
    } catch (e) {
      if (e instanceof z.ZodError) {
        throw new MultiException(
          e.issues.map((issue) => new InputValidationException(issue.message, issue.path.map(String))),
        );
      }
      throw e;
    }
  }
}
