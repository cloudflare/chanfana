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
  message: string;
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
    const innerError = {
      code: inst.code,
      message: inst.default_message,
    };

    if (inst.includesPath === true) {
      // @ts-expect-error
      innerError.path = ["body", "fieldName"];
    }

    return {
      [inst.status]: {
        description: inst.default_message,
        ...contentJson({
          success: z.literal(false),
          errors: [innerError],
        }),
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
  isVisible = true;
  default_message = "Input Validation Error";
  status = 400;
  code = 7001;
  path = null;
  includesPath = true;

  constructor(message?: string, path?: any) {
    super(message);
    this.path = path;
  }

  buildResponse() {
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
  isVisible = true;
  errors: Array<ApiException>;
  status = 400;

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

  buildResponse() {
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
  isVisible = true;
  default_message = "Not Found";
  status = 404;
  code = 7002;
}

/**
 * Exception for unauthorized access (401).
 * Used when authentication is required but not provided or invalid.
 */
export class UnauthorizedException extends ApiException {
  isVisible = true;
  default_message = "Unauthorized";
  status = 401;
  code = 7003;
}

/**
 * Exception for forbidden access (403).
 * Used when the user is authenticated but doesn't have permission.
 */
export class ForbiddenException extends ApiException {
  isVisible = true;
  default_message = "Forbidden";
  status = 403;
  code = 7004;
}

/**
 * Exception for method not allowed (405).
 * Used when the HTTP method is not supported for the requested resource.
 */
export class MethodNotAllowedException extends ApiException {
  isVisible = true;
  default_message = "Method Not Allowed";
  status = 405;
  code = 7005;
}

/**
 * Exception for conflict errors (409).
 * Used when the request conflicts with the current state (e.g., duplicate resource).
 */
export class ConflictException extends ApiException {
  isVisible = true;
  default_message = "Conflict";
  status = 409;
  code = 7006;
}

/**
 * Exception for unprocessable entity (422).
 * Used when the request is well-formed but semantically incorrect.
 */
export class UnprocessableEntityException extends ApiException {
  isVisible = true;
  default_message = "Unprocessable Entity";
  status = 422;
  code = 7007;
  includesPath = true;
  path: any = null;

  constructor(message?: string, path?: any) {
    super(message);
    this.path = path;
  }

  buildResponse() {
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
  isVisible = true;
  default_message = "Too Many Requests";
  status = 429;
  code = 7008;
  retryAfter?: number;

  constructor(message?: string, retryAfter?: number) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

/**
 * Exception for internal server errors (500).
 * Used when an unexpected error occurs on the server.
 * Note: By default, isVisible is false to prevent leaking internal details.
 */
export class InternalServerErrorException extends ApiException {
  isVisible = false;
  default_message = "Internal Server Error";
  status = 500;
  code = 7009;
}

/**
 * Exception for bad gateway errors (502).
 * Used when an upstream server returns an invalid response.
 */
export class BadGatewayException extends ApiException {
  isVisible = true;
  default_message = "Bad Gateway";
  status = 502;
  code = 7010;
}

/**
 * Exception for service unavailable (503).
 * Used when the server is temporarily unavailable (maintenance, overload).
 */
export class ServiceUnavailableException extends ApiException {
  isVisible = true;
  default_message = "Service Unavailable";
  status = 503;
  code = 7011;
  retryAfter?: number;

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
  isVisible = true;
  default_message = "Gateway Timeout";
  status = 504;
  code = 7012;
}
