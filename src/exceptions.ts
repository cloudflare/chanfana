import { z } from "zod";
import { contentJson } from "./contentTypes";

/**
 * Base exception class for API errors.
 * Extend this class to create custom API exceptions with specific status codes and error codes.
 *
 * @example
 * ```typescript
 * throw new ApiException("Something went wrong");
 * ```
 */
export class ApiException extends Error {
  isVisible = true;
  override message: string;
  default_message = "Internal Error";
  status = 500;
  code = 7000;
  includesPath = false;

  constructor(message = "") {
    super(message);
    this.message = message;
  }

  buildResponse() {
    return [
      {
        code: this.code,
        message: this.isVisible ? this.message || this.default_message : "Internal Error",
      },
    ];
  }

  static schema() {
    const inst = new this();

    const errorSchema = inst.includesPath
      ? z.object({
          code: z.number(),
          message: z.string(),
          path: z.array(z.string()),
        })
      : z.object({
          code: z.number(),
          message: z.string(),
        });

    return {
      [inst.status]: {
        description: inst.default_message,
        ...contentJson(
          z.object({
            success: z.literal(false),
            errors: z.array(errorSchema),
          }),
        ),
      },
    };
  }
}

/**
 * Exception for input validation errors (400).
 * Used when request data fails Zod schema validation.
 *
 * @example
 * ```typescript
 * throw new InputValidationException("Invalid email format", ["body", "email"]);
 * ```
 */
export class InputValidationException extends ApiException {
  override isVisible = true;
  override default_message = "Input Validation Error";
  override status = 400;
  override code = 7001;
  path: unknown = null;
  override includesPath = true;

  constructor(message?: string, path?: unknown) {
    super(message);
    this.path = path;
  }

  override buildResponse() {
    return [
      {
        code: this.code,
        message: this.isVisible ? this.message : "Internal Error",
        path: this.path,
      },
    ];
  }
}

/**
 * Exception that aggregates multiple API exceptions.
 * The highest status code among all errors will be used as the response status.
 *
 * @example
 * ```typescript
 * throw new MultiException([
 *   new InputValidationException("Invalid email", ["body", "email"]),
 *   new InputValidationException("Invalid name", ["body", "name"]),
 * ]);
 * ```
 */
export class MultiException extends ApiException {
  override isVisible = true;
  errors: Array<ApiException>;
  override status = 400;

  constructor(errors: Array<ApiException>) {
    super("Multiple Exceptions");
    this.errors = errors;

    // Because the API can only return 1 status code, always return the highest
    for (const err of errors) {
      if (err.status > this.status) {
        this.status = err.status;
      }

      if (!err.isVisible && this.isVisible) {
        this.isVisible = false;
      }
    }
  }

  override buildResponse() {
    return this.errors.flatMap((err) => err.buildResponse());
  }
}

/**
 * Exception for resource not found (404).
 * Used when the requested resource doesn't exist.
 *
 * @example
 * ```typescript
 * throw new NotFoundException("User not found");
 * ```
 */
export class NotFoundException extends ApiException {
  override isVisible = true;
  override default_message = "Not Found";
  override status = 404;
  override code = 7002;
}

/**
 * Exception for unauthorized access (401).
 * Used when authentication is required but not provided or invalid.
 */
export class UnauthorizedException extends ApiException {
  override isVisible = true;
  override default_message = "Unauthorized";
  override status = 401;
  override code = 7003;
}

/**
 * Exception for forbidden access (403).
 * Used when the user is authenticated but doesn't have permission.
 */
export class ForbiddenException extends ApiException {
  override isVisible = true;
  override default_message = "Forbidden";
  override status = 403;
  override code = 7004;
}

/**
 * Exception for method not allowed (405).
 * Used when the HTTP method is not supported for the requested resource.
 */
export class MethodNotAllowedException extends ApiException {
  override isVisible = true;
  override default_message = "Method Not Allowed";
  override status = 405;
  override code = 7005;
}

/**
 * Exception for conflict errors (409).
 * Used when the request conflicts with the current state (e.g., duplicate resource).
 */
export class ConflictException extends ApiException {
  override isVisible = true;
  override default_message = "Conflict";
  override status = 409;
  override code = 7006;
}

/**
 * Exception for unprocessable entity (422).
 * Used when the request is well-formed but semantically incorrect.
 */
export class UnprocessableEntityException extends ApiException {
  override isVisible = true;
  override default_message = "Unprocessable Entity";
  override status = 422;
  override code = 7007;
  override includesPath = true;
  path: unknown = null;

  constructor(message?: string, path?: unknown) {
    super(message);
    this.path = path;
  }

  override buildResponse() {
    return [
      {
        code: this.code,
        message: this.isVisible ? this.message || this.default_message : "Internal Error",
        path: this.path,
      },
    ];
  }
}

/**
 * Exception for rate limiting (429).
 * Used when the user has sent too many requests in a given time period.
 */
export class TooManyRequestsException extends ApiException {
  override isVisible = true;
  override default_message = "Too Many Requests";
  override status = 429;
  override code = 7008;
  retryAfter?: number | undefined;

  constructor(message?: string, retryAfter?: number) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

/**
 * Exception for unexpected server errors (500).
 * Unlike the base ApiException (also 500, code 7000), this class defaults to isVisible=false,
 * meaning the error message is hidden from clients and replaced with "Internal Error".
 * Use this for errors that should be logged but not exposed to end users.
 * Use the base ApiException when the error message is safe to expose.
 */
export class InternalServerErrorException extends ApiException {
  override isVisible = false;
  override default_message = "Internal Server Error";
  override status = 500;
  override code = 7009;
}

/**
 * Exception for bad gateway errors (502).
 * Used when an upstream server returns an invalid response.
 */
export class BadGatewayException extends ApiException {
  override isVisible = true;
  override default_message = "Bad Gateway";
  override status = 502;
  override code = 7010;
}

/**
 * Exception for service unavailable (503).
 * Used when the server is temporarily unavailable (maintenance, overload).
 */
export class ServiceUnavailableException extends ApiException {
  override isVisible = true;
  override default_message = "Service Unavailable";
  override status = 503;
  override code = 7011;
  retryAfter?: number | undefined;

  constructor(message?: string, retryAfter?: number) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

/**
 * Exception for gateway timeout (504).
 * Used when an upstream server doesn't respond in time.
 */
export class GatewayTimeoutException extends ApiException {
  override isVisible = true;
  override default_message = "Gateway Timeout";
  override status = 504;
  override code = 7012;
}

/**
 * Exception for response validation errors (500).
 * Used when a handler's response doesn't match its declared Zod response schema.
 * This is a server-side bug (the handler produced invalid data), not a client error.
 * Error details are hidden from clients (isVisible=false) and logged via console.error.
 */
export class ResponseValidationException extends ApiException {
  override isVisible = false;
  override default_message = "Response Validation Error";
  override status = 500;
  override code = 7013;

  constructor(message?: string, options?: ErrorOptions) {
    super(message ?? "");
    if (message) {
      this.message = message;
    }
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}
