import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  fromIttyRouter,
  GatewayTimeoutException,
  InputValidationException,
  InternalServerErrorException,
  MethodNotAllowedException,
  MultiException,
  NotFoundException,
  OpenAPIRoute,
  ServiceUnavailableException,
  TooManyRequestsException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "../../src";
import { contentJson } from "../../src/contentTypes";
import { buildRequest } from "../utils";

// Test endpoint that throws ApiException
class ThrowApiExceptionEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    throw new ApiException("Something went wrong");
  }
}

// Test endpoint that throws NotFoundException
class ThrowNotFoundEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    throw new NotFoundException();
  }
}

// Test endpoint that throws NotFoundException with custom message
class ThrowNotFoundWithMessageEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    throw new NotFoundException("User not found");
  }
}

// Test endpoint that throws InputValidationException
class ThrowInputValidationEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    throw new InputValidationException("Invalid email format", ["body", "email"]);
  }
}

// Test endpoint that throws MultiException
class ThrowMultiExceptionEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    const errors = [
      new InputValidationException("Invalid email", ["body", "email"]),
      new InputValidationException("Invalid name", ["body", "name"]),
    ];
    throw new MultiException(errors);
  }
}

// Test endpoint with validation schema to test validation error format
class ValidationEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson(
        z.object({
          name: z.string(),
          age: z.number(),
        }),
      ),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    await this.getValidatedData();
    return { success: true };
  }
}

// Custom error wrapper (simulating user's pattern from the MR)
class CustomWrappedError extends Error {
  constructor(public readonly originalError: ApiException) {
    super(originalError.message);
    this.name = "CustomWrappedError";
  }
}

// Test endpoint that uses handleError hook to transform errors
class HandleErrorHookEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  protected handleError(error: unknown): unknown {
    if (error instanceof ApiException) {
      return new CustomWrappedError(error);
    }
    return error;
  }

  async handle() {
    throw new NotFoundException("Resource not found");
  }
}

// Test endpoint with handleError that re-classifies errors
class HandleErrorReclassifyEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson(
        z.object({
          email: z.string(),
        }),
      ),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  protected handleError(error: unknown): unknown {
    // Convert validation MultiException to a single ApiException
    if (error instanceof MultiException) {
      return new ApiException("Custom validation failed");
    }
    return error;
  }

  async handle() {
    await this.getValidatedData();
    return { success: true };
  }
}

// Test endpoint that throws ZodError
class ThrowZodErrorEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    // This will throw a ZodError
    z.string().parse(123);
  }
}

// Test endpoint with hidden error
class ThrowHiddenErrorEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ success: z.boolean() })),
      },
    },
  };

  async handle() {
    const error = new ApiException("Sensitive internal error details");
    error.isVisible = false;
    throw error;
  }
}

describe("Exception Handling", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/api-exception", ThrowApiExceptionEndpoint);
  router.get("/not-found", ThrowNotFoundEndpoint);
  router.get("/not-found-message", ThrowNotFoundWithMessageEndpoint);
  router.get("/input-validation", ThrowInputValidationEndpoint);
  router.get("/multi-exception", ThrowMultiExceptionEndpoint);
  router.get("/zod-error", ThrowZodErrorEndpoint);
  router.get("/hidden-error", ThrowHiddenErrorEndpoint);
  router.post("/validation", ValidationEndpoint);
  router.get("/handle-error-hook", HandleErrorHookEndpoint);
  router.post("/handle-error-reclassify", HandleErrorReclassifyEndpoint);

  it("should catch ApiException and return 500 with error response", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/api-exception" }));
    const resp = await request.json();

    expect(request.status).toEqual(500);
    expect(resp.success).toBe(false);
    expect(resp.errors).toHaveLength(1);
    expect(resp.errors[0].code).toBe(7000);
    expect(resp.errors[0].message).toBe("Something went wrong");
    expect(resp.result).toEqual({});
  });

  it("should catch NotFoundException and return 404", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/not-found" }));
    const resp = await request.json();

    expect(request.status).toEqual(404);
    expect(resp.success).toBe(false);
    expect(resp.errors).toHaveLength(1);
    expect(resp.errors[0].code).toBe(7002);
    expect(resp.errors[0].message).toBe("Not Found");
  });

  it("should catch NotFoundException with custom message", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/not-found-message" }));
    const resp = await request.json();

    expect(request.status).toEqual(404);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].message).toBe("User not found");
  });

  it("should catch InputValidationException and return 400 with path", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/input-validation" }));
    const resp = await request.json();

    expect(request.status).toEqual(400);
    expect(resp.success).toBe(false);
    expect(resp.errors).toHaveLength(1);
    expect(resp.errors[0].code).toBe(7001);
    expect(resp.errors[0].message).toBe("Invalid email format");
    expect(resp.errors[0].path).toEqual(["body", "email"]);
  });

  it("should catch MultiException and return aggregated errors", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/multi-exception" }));
    const resp = await request.json();

    expect(request.status).toEqual(400);
    expect(resp.success).toBe(false);
    expect(resp.errors).toHaveLength(2);
    expect(resp.errors[0].message).toBe("Invalid email");
    expect(resp.errors[0].path).toEqual(["body", "email"]);
    expect(resp.errors[1].message).toBe("Invalid name");
    expect(resp.errors[1].path).toEqual(["body", "name"]);
  });

  it("should catch ZodError and return 400 with InputValidationException format", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/zod-error" }));
    const resp = await request.json();

    expect(request.status).toEqual(400);
    expect(resp.success).toBe(false);
    expect(resp.errors).toHaveLength(1);
    // Direct ZodErrors from handle() should also use InputValidationException format
    // (code 7001) for consistency with validateRequest() errors
    expect(resp.errors[0].code).toBe(7001);
    expect(typeof resp.errors[0].message).toBe("string");
    expect(Array.isArray(resp.errors[0].path)).toBe(true);
  });

  it("should hide internal error details when isVisible is false", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/hidden-error" }));
    const resp = await request.json();

    expect(request.status).toEqual(500);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].message).toBe("Internal Error");
    expect(resp.errors[0].message).not.toBe("Sensitive internal error details");
  });

  it("should wrap validation ZodErrors as InputValidationException with code 7001", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "POST",
        path: "/validation",
        json: () => ({ name: 123 }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const resp = await request.json();

    expect(request.status).toEqual(400);
    expect(resp.success).toBe(false);
    expect(resp.errors.length).toBeGreaterThan(0);
    // Validation errors should use InputValidationException format (code 7001)
    // instead of raw Zod issue format (code: "invalid_type")
    for (const error of resp.errors) {
      expect(error.code).toBe(7001);
      expect(typeof error.message).toBe("string");
      expect(Array.isArray(error.path)).toBe(true);
    }
  });

  it("should call handleError hook when handle() throws", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/handle-error-hook" }));

    // handleError wraps NotFoundException in CustomWrappedError (a plain Error),
    // which formatChanfanaError does not recognize, so it is re-thrown
    // and itty-router returns a 500 status
    expect(request.status).toEqual(500);
  });

  it("should allow handleError to reclassify validation errors", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "POST",
        path: "/handle-error-reclassify",
        json: () => ({ wrong: "field" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const resp = await request.json();

    // handleError converts the MultiException to a generic ApiException
    expect(request.status).toEqual(500);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7000);
    expect(resp.errors[0].message).toBe("Custom validation failed");
  });
});

describe("Exception Schema Generation", () => {
  it("should generate correct schema for ApiException", () => {
    const schema = ApiException.schema();
    expect(schema[500]).toBeDefined();
    expect(schema[500]?.description).toBe("Internal Error");
  });

  it("should generate correct schema for NotFoundException", () => {
    const schema = NotFoundException.schema();
    expect(schema[404]).toBeDefined();
    expect(schema[404]?.description).toBe("Not Found");
  });

  it("should generate correct schema for InputValidationException", () => {
    const schema = InputValidationException.schema();
    expect(schema[400]).toBeDefined();
    expect(schema[400]?.description).toBe("Input Validation Error");
  });
});

describe("MultiException Status Code Logic", () => {
  it("should use highest status code from errors", () => {
    const error1 = new InputValidationException("Validation error");
    error1.status = 400;

    const error2 = new ApiException("Server error");
    error2.status = 500;

    const multi = new MultiException([error1, error2]);
    expect(multi.status).toBe(500);
  });

  it("should set isVisible to false if any error is not visible", () => {
    const error1 = new InputValidationException("Visible error");
    error1.isVisible = true;

    const error2 = new ApiException("Hidden error");
    error2.isVisible = false;

    const multi = new MultiException([error1, error2]);
    expect(multi.isVisible).toBe(false);
  });

  it("should keep isVisible true if all errors are visible", () => {
    const error1 = new InputValidationException("Visible error 1");
    error1.isVisible = true;

    const error2 = new InputValidationException("Visible error 2");
    error2.isVisible = true;

    const multi = new MultiException([error1, error2]);
    expect(multi.isVisible).toBe(true);
  });
});

describe("New Exception Types", () => {
  describe("UnauthorizedException", () => {
    it("should have correct defaults", () => {
      const error = new UnauthorizedException();
      expect(error.status).toBe(401);
      expect(error.code).toBe(7003);
      expect(error.default_message).toBe("Unauthorized");
      expect(error.isVisible).toBe(true);
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedException("Invalid token");
      expect(error.message).toBe("Invalid token");
    });

    it("should generate correct schema", () => {
      const schema = UnauthorizedException.schema();
      expect(schema[401]).toBeDefined();
      expect(schema[401]?.description).toBe("Unauthorized");
    });
  });

  describe("ForbiddenException", () => {
    it("should have correct defaults", () => {
      const error = new ForbiddenException();
      expect(error.status).toBe(403);
      expect(error.code).toBe(7004);
      expect(error.default_message).toBe("Forbidden");
      expect(error.isVisible).toBe(true);
    });

    it("should generate correct schema", () => {
      const schema = ForbiddenException.schema();
      expect(schema[403]).toBeDefined();
      expect(schema[403]?.description).toBe("Forbidden");
    });
  });

  describe("MethodNotAllowedException", () => {
    it("should have correct defaults", () => {
      const error = new MethodNotAllowedException();
      expect(error.status).toBe(405);
      expect(error.code).toBe(7005);
      expect(error.default_message).toBe("Method Not Allowed");
    });
  });

  describe("ConflictException", () => {
    it("should have correct defaults", () => {
      const error = new ConflictException();
      expect(error.status).toBe(409);
      expect(error.code).toBe(7006);
      expect(error.default_message).toBe("Conflict");
    });

    it("should accept custom message", () => {
      const error = new ConflictException("Resource already exists");
      expect(error.message).toBe("Resource already exists");
    });
  });

  describe("UnprocessableEntityException", () => {
    it("should have correct defaults", () => {
      const error = new UnprocessableEntityException();
      expect(error.status).toBe(422);
      expect(error.code).toBe(7007);
      expect(error.default_message).toBe("Unprocessable Entity");
      expect(error.includesPath).toBe(true);
    });

    it("should accept message and path", () => {
      const error = new UnprocessableEntityException("Invalid date range", ["body", "dateRange"]);
      expect(error.message).toBe("Invalid date range");
      expect(error.path).toEqual(["body", "dateRange"]);
    });

    it("should build response with path", () => {
      const error = new UnprocessableEntityException("Invalid", ["body", "field"]);
      const response = error.buildResponse();
      expect(response).toHaveLength(1);
      expect(response[0]?.code).toBe(7007);
      expect(response[0]?.message).toBe("Invalid");
      expect((response[0] as { path: string[] }).path).toEqual(["body", "field"]);
    });
  });

  describe("TooManyRequestsException", () => {
    it("should have correct defaults", () => {
      const error = new TooManyRequestsException();
      expect(error.status).toBe(429);
      expect(error.code).toBe(7008);
      expect(error.default_message).toBe("Too Many Requests");
    });

    it("should accept retryAfter parameter", () => {
      const error = new TooManyRequestsException("Rate limit exceeded", 60);
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.retryAfter).toBe(60);
    });
  });

  describe("InternalServerErrorException", () => {
    it("should have correct defaults", () => {
      const error = new InternalServerErrorException();
      expect(error.status).toBe(500);
      expect(error.code).toBe(7009);
      expect(error.default_message).toBe("Internal Server Error");
      expect(error.isVisible).toBe(false); // Important: hidden by default
    });

    it("should hide message in response", () => {
      const error = new InternalServerErrorException("Database connection failed");
      const response = error.buildResponse();
      // Should return "Internal Error" instead of actual message
      expect(response).toHaveLength(1);
      expect(response[0]?.message).toBe("Internal Error");
    });
  });

  describe("BadGatewayException", () => {
    it("should have correct defaults", () => {
      const error = new BadGatewayException();
      expect(error.status).toBe(502);
      expect(error.code).toBe(7010);
      expect(error.default_message).toBe("Bad Gateway");
    });
  });

  describe("ServiceUnavailableException", () => {
    it("should have correct defaults", () => {
      const error = new ServiceUnavailableException();
      expect(error.status).toBe(503);
      expect(error.code).toBe(7011);
      expect(error.default_message).toBe("Service Unavailable");
    });

    it("should accept retryAfter parameter", () => {
      const error = new ServiceUnavailableException("Maintenance in progress", 300);
      expect(error.message).toBe("Maintenance in progress");
      expect(error.retryAfter).toBe(300);
    });
  });

  describe("GatewayTimeoutException", () => {
    it("should have correct defaults", () => {
      const error = new GatewayTimeoutException();
      expect(error.status).toBe(504);
      expect(error.code).toBe(7012);
      expect(error.default_message).toBe("Gateway Timeout");
    });
  });
});

describe("New Exceptions in Route Handler", () => {
  // Create test endpoints for each new exception type
  class ThrowUnauthorizedEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new UnauthorizedException("Invalid API key");
    }
  }

  class ThrowForbiddenEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new ForbiddenException("Insufficient permissions");
    }
  }

  class ThrowConflictEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new ConflictException("User already exists");
    }
  }

  class ThrowTooManyRequestsEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new TooManyRequestsException("Rate limit exceeded", 60);
    }
  }

  class ThrowServiceUnavailableEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new ServiceUnavailableException("Under maintenance");
    }
  }

  class ThrowInternalServerErrorEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new InternalServerErrorException("secret database details");
    }
  }

  class ThrowUnprocessableEntityEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new UnprocessableEntityException("Invalid date range", ["body", "startDate"]);
    }
  }

  class ThrowMethodNotAllowedEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new MethodNotAllowedException("Use POST instead");
    }
  }

  class ThrowBadGatewayEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new BadGatewayException("Upstream error");
    }
  }

  class ThrowGatewayTimeoutEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new GatewayTimeoutException("Upstream timeout");
    }
  }

  class ThrowTooManyRequestsWithRetryEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new TooManyRequestsException("Rate limited", 120);
    }
  }

  class ThrowServiceUnavailableWithRetryEndpoint extends OpenAPIRoute {
    schema = {
      responses: { "200": { description: "Success", ...contentJson(z.object({ success: z.boolean() })) } },
    };
    async handle() {
      throw new ServiceUnavailableException("Maintenance", 300);
    }
  }

  const router = fromIttyRouter(AutoRouter());
  router.get("/unauthorized", ThrowUnauthorizedEndpoint);
  router.get("/forbidden", ThrowForbiddenEndpoint);
  router.get("/conflict", ThrowConflictEndpoint);
  router.get("/too-many-requests", ThrowTooManyRequestsEndpoint);
  router.get("/service-unavailable", ThrowServiceUnavailableEndpoint);
  router.get("/internal-server-error", ThrowInternalServerErrorEndpoint);
  router.get("/unprocessable-entity", ThrowUnprocessableEntityEndpoint);
  router.get("/method-not-allowed", ThrowMethodNotAllowedEndpoint);
  router.get("/bad-gateway", ThrowBadGatewayEndpoint);
  router.get("/gateway-timeout", ThrowGatewayTimeoutEndpoint);
  router.get("/too-many-requests-retry", ThrowTooManyRequestsWithRetryEndpoint);
  router.get("/service-unavailable-retry", ThrowServiceUnavailableWithRetryEndpoint);

  it("should return 401 for UnauthorizedException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/unauthorized" }));
    const resp = await request.json();

    expect(request.status).toEqual(401);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7003);
    expect(resp.errors[0].message).toBe("Invalid API key");
  });

  it("should return 403 for ForbiddenException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/forbidden" }));
    const resp = await request.json();

    expect(request.status).toEqual(403);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7004);
    expect(resp.errors[0].message).toBe("Insufficient permissions");
  });

  it("should return 409 for ConflictException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/conflict" }));
    const resp = await request.json();

    expect(request.status).toEqual(409);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7006);
    expect(resp.errors[0].message).toBe("User already exists");
  });

  it("should return 429 for TooManyRequestsException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/too-many-requests" }));
    const resp = await request.json();

    expect(request.status).toEqual(429);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7008);
    expect(resp.errors[0].message).toBe("Rate limit exceeded");
  });

  it("should return 503 for ServiceUnavailableException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/service-unavailable" }));
    const resp = await request.json();

    expect(request.status).toEqual(503);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7011);
    expect(resp.errors[0].message).toBe("Under maintenance");
  });

  it("should return 500 and hide message for InternalServerErrorException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/internal-server-error" }));
    const resp = await request.json();

    expect(request.status).toEqual(500);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7009);
    // Message should be hidden (isVisible=false)
    expect(resp.errors[0].message).toBe("Internal Error");
    expect(resp.errors[0].message).not.toBe("secret database details");
  });

  it("should return 422 with path for UnprocessableEntityException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/unprocessable-entity" }));
    const resp = await request.json();

    expect(request.status).toEqual(422);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7007);
    expect(resp.errors[0].message).toBe("Invalid date range");
    expect(resp.errors[0].path).toEqual(["body", "startDate"]);
  });

  it("should return 405 for MethodNotAllowedException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/method-not-allowed" }));
    const resp = await request.json();

    expect(request.status).toEqual(405);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7005);
    expect(resp.errors[0].message).toBe("Use POST instead");
  });

  it("should return 502 for BadGatewayException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/bad-gateway" }));
    const resp = await request.json();

    expect(request.status).toEqual(502);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7010);
    expect(resp.errors[0].message).toBe("Upstream error");
  });

  it("should return 504 for GatewayTimeoutException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/gateway-timeout" }));
    const resp = await request.json();

    expect(request.status).toEqual(504);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7012);
    expect(resp.errors[0].message).toBe("Upstream timeout");
  });

  it("should set Retry-After header for TooManyRequestsException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/too-many-requests-retry" }));

    expect(request.status).toEqual(429);
    expect(request.headers.get("Retry-After")).toBe("120");
  });

  it("should set Retry-After header for ServiceUnavailableException", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/service-unavailable-retry" }));

    expect(request.status).toEqual(503);
    expect(request.headers.get("Retry-After")).toBe("300");
  });
});
