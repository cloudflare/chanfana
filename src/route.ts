import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { ApiException } from "./exceptions";
import { coerceInputs } from "./parameters";
import type { AnyZodObject, OpenAPIRouteSchema, RouteOptions, ValidatedData } from "./types";
import { jsonResp } from "./utils";

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
   * Formats validation errors into a standardized response.
   * @param errors - Array of Zod validation issues
   * @returns JSON response with validation errors
   */
  handleValidationError(errors: z.ZodIssue[]): Response {
    return jsonResp(
      {
        errors: errors,
        success: false,
        result: {},
      },
      {
        status: 400,
      },
    );
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
    } catch (e) {
      if (e instanceof z.ZodError) {
        return this.handleValidationError(e.issues);
      }

      // Handle ApiException using instanceof for proper type checking
      if (e instanceof ApiException) {
        return jsonResp(
          {
            success: false,
            errors: e.buildResponse(),
            result: {},
          },
          {
            status: e.status,
          },
        );
      }

      throw e;
    }

    // Auto-convert plain objects to JSON responses
    if (resp !== null && resp !== undefined && !(resp instanceof Response) && typeof resp === "object") {
      return jsonResp(resp);
    }

    // Validate return type - if not null/undefined and not Response, it's invalid
    if (resp !== null && resp !== undefined && !(resp instanceof Response)) {
      throw new Error(`Invalid return type from handle(): expected Response or object, got ${typeof resp}`);
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

    return await validationSchema.parseAsync(unvalidatedData);
  }
}
