import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromHono, fromIttyRouter } from "../../src";
import { contentJson } from "../../src/contentTypes";
import { ApiException, MultiException, NotFoundException, ResponseValidationException } from "../../src/exceptions";
import { OpenAPIRoute } from "../../src/route";
import { buildRequest } from "../utils";

class EndpointWithoutOperationId extends OpenAPIRoute {
  schema = {
    summary: "Get a single ToDo",
    responses: {},
  };

  async handle(_request: Request, _env: any, _context: any) {
    return {
      msg: "EndpointWithoutOperationId",
    };
  }
}

class EndpointWithOperationId extends OpenAPIRoute {
  schema = {
    responses: {},
    operationId: "get_my_todo",
    summary: "Get a single ToDo",
  };

  async handle(_request: Request, _env: any, _context: any) {
    return {
      msg: "EndpointWithOperationId",
    };
  }
}

describe("routerOptions", () => {
  it("generate operation ids false", async () => {
    const t = () => {
      const router = fromIttyRouter(AutoRouter(), {
        generateOperationIds: false,
      });
      router.get("/todo", EndpointWithoutOperationId);
    };

    expect(t).toThrow("Route /todo doesn't have operationId set!");
  });

  it("generate operation ids true and unset", async () => {
    const routerTrue = fromIttyRouter(AutoRouter(), {
      generateOperationIds: true,
    });
    routerTrue.get("/todo", EndpointWithoutOperationId);

    if (routerTrue.schema.paths?.["/todo"]?.get) {
      expect(routerTrue.schema.paths["/todo"].get.operationId).toEqual("get_EndpointWithoutOperationId");
    } else {
      throw new Error("/todo not found in schema");
    }

    const routerUnset = fromIttyRouter(AutoRouter());
    routerUnset.get("/todo", EndpointWithoutOperationId);

    if (routerUnset.schema.paths?.["/todo"]?.get) {
      expect(routerUnset.schema.paths["/todo"].get.operationId).toEqual("get_EndpointWithoutOperationId");
    } else {
      throw new Error("/todo not found in schema");
    }
  });

  it("generate operation ids true on endpoint with operation id", async () => {
    const router = fromIttyRouter(AutoRouter(), {
      generateOperationIds: true,
    });
    router.get("/todo", EndpointWithOperationId);

    if (router.schema.paths?.["/todo"]?.get) {
      expect(router.schema.paths["/todo"].get.operationId).toEqual("get_my_todo");
    } else {
      throw new Error("/todo not found in schema");
    }
  });

  it("with base empty", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/todo" }));
    const resp = await request.json();

    expect(resp.msg).toEqual("EndpointWithOperationId");
  });

  it("with base defined", async () => {
    const router = fromIttyRouter(AutoRouter({ base: "/api" }), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/api/todo" }));
    const resp = await request.json();

    expect(resp.msg).toEqual("EndpointWithOperationId");
  });

  it("itty router options are accessible via proxy", async () => {
    const router = fromIttyRouter(AutoRouter({ base: "/api" }), {
      base: "/api",
      generateOperationIds: true,
    });

    expect(router.options).toBeDefined();
    expect(router.options.base).toEqual("/api");
    expect(router.options.generateOperationIds).toEqual(true);
  });
});

describe("routerOptions Hono", () => {
  it("hono with base empty - route matching works", async () => {
    const router = fromHono(new Hono());
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/todo"));
    const resp = (await request.json()) as { msg: string };

    expect(request.status).toEqual(200);
    expect(resp.msg).toEqual("EndpointWithOperationId");
  });

  it("hono with base defined - route matching works at /api/todo", async () => {
    const router = fromHono(new Hono(), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/api/todo"));
    const resp = (await request.json()) as { msg: string };

    expect(request.status).toEqual(200);
    expect(resp.msg).toEqual("EndpointWithOperationId");
  });

  it("hono with base defined - OpenAPI schema has paths prefixed with /api", async () => {
    const router = fromHono(new Hono(), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const schema = router.schema;
    expect(schema.paths?.["/api/todo"]).toBeDefined();
    expect(schema.paths?.["/api/todo"]?.get).toBeDefined();
  });

  it("hono with base defined - /api/openapi.json is accessible", async () => {
    const router = fromHono(new Hono(), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/api/openapi.json"));
    const resp = (await request.json()) as { paths: Record<string, any> };

    expect(request.status).toEqual(200);
    expect(resp.paths).toBeDefined();
    expect(resp.paths["/api/todo"]).toBeDefined();
  });

  it("hono with base defined - /api/docs is accessible", async () => {
    const router = fromHono(new Hono(), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/api/docs"));

    expect(request.status).toEqual(200);
    expect(request.headers.get("content-type")).toContain("text/html");
    const html = await request.text();
    // Swagger UI should reference the correct openapi.json URL
    expect(html).toContain("/api/openapi.json");
  });

  it("hono with base defined - route without base prefix returns 404", async () => {
    const router = fromHono(new Hono(), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/todo"));

    expect(request.status).toEqual(404);
  });

  it("hono router options are accessible via proxy", async () => {
    const router = fromHono(new Hono(), {
      base: "/api",
      generateOperationIds: true,
    });

    expect(router.options).toBeDefined();
    expect(router.options.base).toEqual("/api");
    expect(router.options.generateOperationIds).toEqual(true);
  });
});

describe("Hono basePath behavior (without fromHono)", () => {
  it("calling basePath() on fresh Hono does not double-prefix routes", async () => {
    // This test confirms Hono's native behavior: basePath() returns a new instance
    // and does NOT cause double-prefixing when routes are registered on the based instance
    const app = new Hono();
    const based = app.basePath("/api");

    based.get("/todo", (c) => c.json({ msg: "todo" }));

    // Route should be at /api/todo, not /api/api/todo
    const request = await based.fetch(new Request("http://localhost/api/todo"));
    expect(request.status).toEqual(200);
    const resp = (await request.json()) as { msg: string };
    expect(resp.msg).toEqual("todo");

    // /api/api/todo should NOT exist (no double-prefix)
    const doubleRequest = await based.fetch(new Request("http://localhost/api/api/todo"));
    expect(doubleRequest.status).toEqual(404);
  });

  it("chained basePath() calls append paths correctly", async () => {
    // Confirms that basePath("/api").basePath("/v1") results in /api/v1
    const app = new Hono();
    const based = app.basePath("/api").basePath("/v1");

    based.get("/todo", (c) => c.json({ msg: "todo" }));

    // Route should be at /api/v1/todo
    const request = await based.fetch(new Request("http://localhost/api/v1/todo"));
    expect(request.status).toEqual(200);
    const resp = (await request.json()) as { msg: string };
    expect(resp.msg).toEqual("todo");

    // Neither /api/todo nor /v1/todo should work
    const apiOnly = await based.fetch(new Request("http://localhost/api/todo"));
    expect(apiOnly.status).toEqual(404);

    const v1Only = await based.fetch(new Request("http://localhost/v1/todo"));
    expect(v1Only.status).toEqual(404);
  });
});

describe("routerOptions Hono with pre-existing basePath", () => {
  it("hono with pre-existing basePath and no chanfana base - route matching works", async () => {
    // User sets basePath on Hono directly before passing to fromHono
    const app = new Hono().basePath("/api");
    const router = fromHono(app);
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/api/todo"));
    const resp = (await request.json()) as { msg: string };

    expect(request.status).toEqual(200);
    expect(resp.msg).toEqual("EndpointWithOperationId");
  });

  it("hono with pre-existing basePath and no chanfana base - OpenAPI schema has correct paths", async () => {
    const app = new Hono().basePath("/api");
    const router = fromHono(app);
    router.get("/todo", EndpointWithOperationId);

    expect(router.schema.paths?.["/api/todo"]).toBeDefined();
    expect(router.schema.paths?.["/api/todo"]?.get).toBeDefined();
  });

  it("hono with pre-existing basePath and no chanfana base - doc routes are prefixed", async () => {
    const app = new Hono().basePath("/api");
    const router = fromHono(app);
    router.get("/todo", EndpointWithOperationId);

    // openapi.json should be at /api/openapi.json
    const openapiReq = await router.fetch(new Request("http://localhost/api/openapi.json"));
    expect(openapiReq.status).toEqual(200);
    const openapiResp = (await openapiReq.json()) as { paths: Record<string, any> };
    expect(openapiResp.paths["/api/todo"]).toBeDefined();

    // docs should be at /api/docs
    const docsReq = await router.fetch(new Request("http://localhost/api/docs"));
    expect(docsReq.status).toEqual(200);
    const docsHtml = await docsReq.text();
    expect(docsHtml).toContain("/api/openapi.json");
  });

  it("hono with pre-existing basePath and chanfana base throws error", () => {
    // Using both Hono's basePath() and chanfana's base option is not allowed.
    // Users should use one or the other to avoid double-prefixing.
    expect(() => {
      fromHono(new Hono().basePath("/api"), { base: "/v1" });
    }).toThrow("base option is no longer needed");
  });

  it("hono with pre-existing basePath only - options.base reflects Hono base", async () => {
    const app = new Hono().basePath("/api");
    const router = fromHono(app);

    // options.base should reflect the Hono base path even when no chanfana base is provided
    expect(router.options.base).toEqual("/api");
  });
});

describe("base path format validation", () => {
  it("base without leading slash throws error", () => {
    expect(() => {
      fromIttyRouter(AutoRouter(), { base: "api" });
    }).toThrow('base must start with "/"');
  });

  it("base with trailing slash throws error", () => {
    expect(() => {
      fromIttyRouter(AutoRouter(), { base: "/api/" });
    }).toThrow('base must not end with "/"');
  });

  it("base without leading slash throws error for Hono", () => {
    expect(() => {
      fromHono(new Hono(), { base: "api" });
    }).toThrow('base must start with "/"');
  });

  it("base with trailing slash throws error for Hono", () => {
    expect(() => {
      fromHono(new Hono(), { base: "/api/" });
    }).toThrow('base must not end with "/"');
  });

  it("base of just slash throws error", () => {
    expect(() => {
      fromIttyRouter(AutoRouter(), { base: "/" });
    }).toThrow('base must not end with "/"');
  });

  it("base of just slash throws error for Hono", () => {
    expect(() => {
      fromHono(new Hono(), { base: "/" });
    }).toThrow('base must not end with "/"');
  });
});

describe("routerOptions Hono openapi.yaml", () => {
  it("hono with base defined - /api/openapi.yaml is accessible", async () => {
    const router = fromHono(new Hono(), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/api/openapi.yaml"));

    expect(request.status).toEqual(200);
    expect(request.headers.get("content-type")).toContain("text/yaml");
    const text = await request.text();
    expect(text).toContain("/api/todo");
  });
});

describe("routerOptions Hono with nested routers and base path", () => {
  it("nested router works with base path on outer router", async () => {
    const innerRouter = fromHono(new Hono());
    innerRouter.get("/todo", EndpointWithOperationId);

    const router = fromHono(new Hono(), { base: "/api" });
    router.route("/v1", innerRouter);

    // Route should be accessible at /api/v1/todo
    const request = await router.fetch(new Request("http://localhost/api/v1/todo"));
    const resp = (await request.json()) as { msg: string };
    expect(request.status).toEqual(200);
    expect(resp.msg).toEqual("EndpointWithOperationId");

    // Schema should reflect the full path
    const schemaReq = await router.fetch(new Request("http://localhost/api/openapi.json"));
    const schemaResp = (await schemaReq.json()) as { paths: Record<string, any> };
    expect(schemaReq.status).toEqual(200);
    expect(schemaResp.paths["/api/v1/todo"]).toBeDefined();
  });
});

// --- raiseOnError tests ---

class EndpointWithValidation extends OpenAPIRoute {
  schema = {
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string(),
              age: z.number().int(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle() {
    const _data = await this.getValidatedData();
    return { success: true };
  }
}

class EndpointThatThrowsNotFound extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle() {
    throw new NotFoundException("Item not found");
  }
}

class EndpointThatThrowsApiException extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle() {
    throw new ApiException("Something went wrong");
  }
}

class EndpointThatThrowsUnknownError extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle() {
    throw new Error("Unexpected failure");
  }
}

describe("Hono error handling", () => {
  it("validation error flows through onError as HTTPException", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });

    const router = fromHono(app);
    router.post("/items", EndpointWithValidation);

    const request = await router.fetch(
      new Request("http://localhost/items", {
        method: "POST",
        body: JSON.stringify({ name: 123 }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const resp = await request.json();

    // Error should have flowed through onError as HTTPException
    expect(caughtError).toBeInstanceOf(HTTPException);
    expect((caughtError as HTTPException).status).toEqual(400);

    // Response should still have chanfana's standard error format
    expect(request.status).toEqual(400);
    expect((resp as any).success).toEqual(false);
    expect((resp as any).errors).toBeDefined();
    expect(Array.isArray((resp as any).errors)).toBe(true);
  });

  it("NotFoundException flows through onError as HTTPException", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });

    const router = fromHono(app);
    router.get("/items/:id", EndpointThatThrowsNotFound);

    const request = await router.fetch(new Request("http://localhost/items/123"));

    const resp = await request.json();

    expect(caughtError).toBeInstanceOf(HTTPException);
    expect((caughtError as HTTPException).status).toEqual(404);

    expect(request.status).toEqual(404);
    expect((resp as any).success).toEqual(false);
    expect((resp as any).errors[0].code).toEqual(7002);
    expect((resp as any).errors[0].message).toEqual("Item not found");
  });

  it("ApiException flows through onError as HTTPException", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });

    const router = fromHono(app);
    router.get("/fail", EndpointThatThrowsApiException);

    const request = await router.fetch(new Request("http://localhost/fail"));

    const resp = await request.json();

    expect(caughtError).toBeInstanceOf(HTTPException);
    expect((caughtError as HTTPException).status).toEqual(500);

    expect(request.status).toEqual(500);
    expect((resp as any).success).toEqual(false);
    expect((resp as any).errors[0].code).toEqual(7000);
  });

  it("unknown errors propagate as-is through onError (not HTTPException)", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      return c.json({ error: "caught" }, 500);
    });

    const router = fromHono(app);
    router.get("/crash", EndpointThatThrowsUnknownError);

    const request = await router.fetch(new Request("http://localhost/crash"));

    const resp = await request.json();

    // Unknown error should NOT be wrapped in HTTPException
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError).not.toBeInstanceOf(HTTPException);
    expect((caughtError as Error).message).toEqual("Unexpected failure");

    expect(request.status).toEqual(500);
    expect((resp as any).error).toEqual("caught");
  });

  it("without onError, HTTPException still returns formatted response via Hono default handler", async () => {
    const app = new Hono();
    const router = fromHono(app);
    router.post("/items", EndpointWithValidation);

    // No app.onError() — Hono's default handler calls HTTPException.getResponse()
    const request = await router.fetch(
      new Request("http://localhost/items", {
        method: "POST",
        body: JSON.stringify({ name: 123 }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const resp = await request.json();

    expect(request.status).toEqual(400);
    expect((resp as any).success).toEqual(false);
    expect((resp as any).errors).toBeDefined();
  });
});

describe("Hono handleError hook", () => {
  // Custom error that bypasses chanfana's formatter
  class MyRouteError extends Error {
    constructor(public readonly apiException: ApiException) {
      super(apiException.message);
      this.name = "MyRouteError";
    }
  }

  class EndpointWithHandleErrorHook extends OpenAPIRoute {
    schema = {
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean() }),
            },
          },
        },
      },
    };

    protected handleError(error: unknown): unknown {
      // Wrap ApiException in a plain Error to bypass chanfana's wrapHandler formatting
      if (error instanceof ApiException) {
        return new MyRouteError(error);
      }
      return error;
    }

    async handle() {
      throw new NotFoundException("Resource not found");
    }
  }

  it("handleError can bypass chanfana error formatting in Hono adapter", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      if (err instanceof MyRouteError) {
        // User handles the error with their own format
        return c.json(
          { success: false, customFormat: true, message: err.apiException.message },
          err.apiException.status as any,
        );
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });

    const router = fromHono(app);
    router.get("/resource/:id", EndpointWithHandleErrorHook);

    const request = await router.fetch(new Request("http://localhost/resource/123"));
    const resp = (await request.json()) as any;

    // Error should reach onError as MyRouteError (not HTTPException)
    expect(caughtError).toBeInstanceOf(MyRouteError);
    expect(caughtError).not.toBeInstanceOf(HTTPException);

    // User's custom format should be used
    expect(request.status).toEqual(404);
    expect(resp.success).toBe(false);
    expect(resp.customFormat).toBe(true);
    expect(resp.message).toBe("Resource not found");
  });

  it("handleError can intercept validation errors in Hono adapter", async () => {
    class ValidationHandleErrorEndpoint extends OpenAPIRoute {
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
            content: {
              "application/json": {
                schema: z.object({ success: z.boolean() }),
              },
            },
          },
        },
      };

      protected handleError(error: unknown): unknown {
        if (error instanceof MultiException) {
          return new MyRouteError(new ApiException("Validation intercepted by handleError"));
        }
        return error;
      }

      async handle() {
        await this.getValidatedData();
        return { success: true };
      }
    }

    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      if (err instanceof MyRouteError) {
        return c.json({ success: false, intercepted: true, message: err.apiException.message }, 400);
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });

    const router = fromHono(app);
    router.post("/validate", ValidationHandleErrorEndpoint);

    const request = await router.fetch(
      new Request("http://localhost/validate", {
        method: "POST",
        body: JSON.stringify({ wrong: "field" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const resp = (await request.json()) as any;

    // handleError should intercept the MultiException from validation
    expect(caughtError).toBeInstanceOf(MyRouteError);
    expect(caughtError).not.toBeInstanceOf(HTTPException);

    expect(request.status).toEqual(400);
    expect(resp.success).toBe(false);
    expect(resp.intercepted).toBe(true);
    expect(resp.message).toBe("Validation intercepted by handleError");
  });
});

describe("itty-router error handling", () => {
  it("validation error returns formatted response directly", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.post("/items", EndpointWithValidation);

    const request = await router.fetch(
      new Request("http://localhost/items", {
        method: "POST",
        body: JSON.stringify({ name: 123 }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const resp = await request.json();

    // itty-router has no onError, so errors are caught and formatted by execute()
    expect(request.status).toEqual(400);
    expect((resp as any).success).toEqual(false);
    expect((resp as any).errors).toBeDefined();
  });

  it("NotFoundException returns formatted response directly", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/items/:id", EndpointThatThrowsNotFound);

    const request = await router.fetch(new Request("http://localhost/items/123", { method: "GET" }));

    const resp = await request.json();

    expect(request.status).toEqual(404);
    expect((resp as any).success).toEqual(false);
    expect((resp as any).errors[0].code).toEqual(7002);
  });
});

// --- validateResponse tests ---

class EndpointWithExtraFields extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            id: z.number(),
            name: z.string(),
          }),
        ),
      },
    },
  };

  async handle() {
    // Return extra fields that are not in the schema
    return {
      id: 1,
      name: "Test",
      secret: "should-be-stripped",
      internal_notes: "also-stripped",
    };
  }
}

class EndpointReturningResponse extends OpenAPIRoute {
  schema = {
    responses: {
      "201": {
        description: "Created",
        ...contentJson(
          z.object({
            success: z.boolean(),
            result: z.object({
              id: z.number(),
              title: z.string(),
            }),
          }),
        ),
      },
    },
  };

  async handle() {
    return Response.json(
      {
        success: true,
        result: {
          id: 42,
          title: "New Item",
          passwordHash: "secret123",
        },
      },
      { status: 201 },
    );
  }
}

class EndpointWithNoResponseSchema extends OpenAPIRoute {
  async handle() {
    return { data: "anything", extra: "allowed" };
  }
}

class EndpointReturningHtml extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            id: z.number(),
          }),
        ),
      },
    },
  };

  async handle() {
    return new Response("<h1>Hello</h1>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }
}

class EndpointReturningNull extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            id: z.number(),
          }),
        ),
      },
    },
  };

  async handle() {
    return null;
  }
}

class EndpointWithDefaultResponseSchema extends OpenAPIRoute {
  schema = {
    responses: {
      default: {
        description: "Default response",
        ...contentJson(
          z.object({
            status: z.string(),
          }),
        ),
      },
    },
  };

  async handle() {
    return { status: "ok", debug: "should-be-stripped" };
  }
}

class EndpointReturningUnmatchedStatus extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            id: z.number(),
          }),
        ),
      },
    },
  };

  async handle() {
    // Return 202 (only 200 is defined in schema) to test fallback passthrough
    return Response.json({ id: 1, extra: "data" }, { status: 202 });
  }
}

class EndpointWithResponseDefaults extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            id: z.number(),
            status: z.string().default("active"),
          }),
        ),
      },
    },
  };

  async handle() {
    // Only return id; the "status" field should get its default from Zod
    return { id: 1 };
  }
}

class EndpointReturningInvalidData extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            id: z.number(),
            name: z.string(),
          }),
        ),
      },
    },
  };

  async handle() {
    // Missing required "name" field
    return { id: 1 };
  }
}

class EndpointWith404Schema extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            id: z.number(),
            name: z.string(),
          }),
        ),
      },
      "404": {
        description: "Not Found",
        ...contentJson(
          z.object({
            error: z.string(),
          }),
        ),
      },
    },
  };

  async handle() {
    // Return a 404 Response with extra fields that should be stripped
    return Response.json({ error: "Not found", debug: "internal-info" }, { status: 404 });
  }
}

class EndpointWithTransform extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson(
          z.object({
            name: z.string().transform((s) => s.toUpperCase()),
            id: z.number(),
          }),
        ),
      },
    },
  };

  async handle() {
    return { id: 1, name: "alice" };
  }
}

describe("validateResponse option", () => {
  describe("itty-router with validateResponse enabled", () => {
    it("should strip unknown fields from plain object responses", async () => {
      const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
      router.get("/items/:id", EndpointWithExtraFields);

      const request = await router.fetch(buildRequest({ method: "GET", path: "/items/1" }));
      const resp = await request.json();

      expect(request.status).toBe(200);
      expect(resp.id).toBe(1);
      expect(resp.name).toBe("Test");
      expect(resp.secret).toBeUndefined();
      expect(resp.internal_notes).toBeUndefined();
    });

    it("should strip unknown fields from Response object bodies", async () => {
      const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
      router.post("/items", EndpointReturningResponse);

      const request = await router.fetch(
        new Request("http://localhost/items", {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        }),
      );
      const resp = await request.json();

      expect(request.status).toBe(201);
      expect(resp.success).toBe(true);
      expect(resp.result.id).toBe(42);
      expect(resp.result.title).toBe("New Item");
      expect(resp.result.passwordHash).toBeUndefined();
    });

    it("should pass through responses when no response schema is defined", async () => {
      const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
      router.get("/items", EndpointWithNoResponseSchema);

      const request = await router.fetch(buildRequest({ method: "GET", path: "/items" }));
      const resp = await request.json();

      expect(request.status).toBe(200);
      expect(resp.data).toBe("anything");
      expect(resp.extra).toBe("allowed");
    });

    it("should return 500 when response is missing required fields", async () => {
      const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
      router.get("/items/:id", EndpointReturningInvalidData);

      const request = await router.fetch(buildRequest({ method: "GET", path: "/items/1" }));
      const resp = await request.json();

      // Response validation failure is a server-side bug → 500, not 400
      expect(request.status).toBe(500);
      expect(resp.success).toBe(false);
      expect(resp.errors[0].code).toBe(7013);
      expect(resp.errors[0].message).toBe("Internal Error");
    });
  });

  it("should pass through non-JSON Response objects unchanged", async () => {
    const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
    router.get("/html", EndpointReturningHtml);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/html" }));

    expect(request.status).toBe(200);
    expect(request.headers.get("content-type")).toBe("text/html");
    const body = await request.text();
    expect(body).toBe("<h1>Hello</h1>");
  });

  it("should handle null responses without errors", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      return c.json({ error: "Internal Server Error" }, 500);
    });

    const router = fromHono(app, { validateResponse: true });
    router.get("/null", EndpointReturningNull);

    const request = await router.fetch(new Request("http://localhost/null", { method: "GET" }));

    // null passes through validateResponse without throwing;
    // no error should reach onError (Hono may return 404 for null responses)
    expect(caughtError).toBeNull();
    expect(request.status).not.toBe(500);
  });

  it("should fall back to the default response schema", async () => {
    const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
    router.get("/default", EndpointWithDefaultResponseSchema);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/default" }));
    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.status).toBe("ok");
    expect(resp.debug).toBeUndefined();
  });

  it("should pass through when status code has no matching schema", async () => {
    const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
    router.get("/unmatched", EndpointReturningUnmatchedStatus);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/unmatched" }));
    const resp = await request.json();

    // 202 has no schema and no "default" → passed through unchanged (extra not stripped)
    expect(request.status).toBe(202);
    expect(resp.id).toBe(1);
    expect(resp.extra).toBe("data");
  });

  it("should apply Zod defaults to response fields", async () => {
    const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
    router.get("/defaults", EndpointWithResponseDefaults);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/defaults" }));
    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.id).toBe(1);
    expect(resp.status).toBe("active");
  });

  it("should validate non-200 Response against matching status-specific schema", async () => {
    const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
    router.get("/not-found", EndpointWith404Schema);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/not-found" }));
    const resp = await request.json();

    expect(request.status).toBe(404);
    expect(resp.error).toBe("Not found");
    // Extra "debug" field should be stripped by the 404 schema
    expect(resp.debug).toBeUndefined();
  });

  it("should apply Zod transforms to response fields", async () => {
    const router = fromIttyRouter(AutoRouter(), { validateResponse: true });
    router.get("/transform", EndpointWithTransform);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/transform" }));
    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.id).toBe(1);
    // The transform should uppercase the name
    expect(resp.name).toBe("ALICE");
  });

  describe("validateResponse with passthroughErrors", () => {
    it("should propagate raw ResponseValidationException to Hono onError", async () => {
      const app = new Hono();
      let caughtError: unknown = null;

      app.onError((err, c) => {
        caughtError = err;
        return c.json({ error: "caught" }, 500);
      });

      const router = fromHono(app, { validateResponse: true, passthroughErrors: true });
      router.get("/items/:id", EndpointReturningInvalidData);

      const request = await router.fetch(new Request("http://localhost/items/1", { method: "GET" }));

      // With passthroughErrors, the raw ResponseValidationException reaches onError (not HTTPException)
      expect(caughtError).toBeInstanceOf(ResponseValidationException);
      expect(caughtError).not.toBeInstanceOf(HTTPException);
      expect(request.status).toBe(500);
    });
  });

  describe("itty-router without validateResponse (default)", () => {
    it("should NOT strip unknown fields when validateResponse is not set", async () => {
      const router = fromIttyRouter(AutoRouter());
      router.get("/items/:id", EndpointWithExtraFields);

      const request = await router.fetch(buildRequest({ method: "GET", path: "/items/1" }));
      const resp = await request.json();

      expect(request.status).toBe(200);
      expect(resp.id).toBe(1);
      expect(resp.name).toBe("Test");
      // Extra fields should still be present
      expect(resp.secret).toBe("should-be-stripped");
      expect(resp.internal_notes).toBe("also-stripped");
    });
  });

  describe("Hono with validateResponse enabled", () => {
    it("should strip unknown fields from plain object responses", async () => {
      const app = new Hono();
      app.onError((err, c) => {
        if (err instanceof HTTPException) {
          return err.getResponse();
        }
        return c.json({ error: "Internal Server Error" }, 500);
      });

      const router = fromHono(app, { validateResponse: true });
      router.get("/items/:id", EndpointWithExtraFields);

      const request = await router.fetch(new Request("http://localhost/items/1", { method: "GET" }));
      const resp = (await request.json()) as any;

      expect(request.status).toBe(200);
      expect(resp.id).toBe(1);
      expect(resp.name).toBe("Test");
      expect(resp.secret).toBeUndefined();
      expect(resp.internal_notes).toBeUndefined();
    });

    it("should return 500 with error code 7013 for invalid response data", async () => {
      const app = new Hono();
      let caughtError: unknown = null;

      app.onError((err, c) => {
        caughtError = err;
        if (err instanceof HTTPException) {
          return err.getResponse();
        }
        return c.json({ error: "Internal Server Error" }, 500);
      });

      const router = fromHono(app, { validateResponse: true });
      router.get("/items/:id", EndpointReturningInvalidData);

      const request = await router.fetch(new Request("http://localhost/items/1", { method: "GET" }));

      // Hono adapter wraps ApiException as HTTPException via wrapHandler
      expect(caughtError).toBeInstanceOf(HTTPException);
      expect((caughtError as HTTPException).status).toBe(500);

      const resp = (await request.json()) as any;
      expect(request.status).toBe(500);
      expect(resp.success).toBe(false);
      expect(resp.errors[0].code).toBe(7013);
      expect(resp.errors[0].message).toBe("Internal Error");
    });

    it("should strip unknown fields from Response object bodies", async () => {
      const app = new Hono();
      app.onError((err, c) => {
        if (err instanceof HTTPException) {
          return err.getResponse();
        }
        return c.json({ error: "Internal Server Error" }, 500);
      });

      const router = fromHono(app, { validateResponse: true });
      router.post("/items", EndpointReturningResponse);

      const request = await router.fetch(
        new Request("http://localhost/items", {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        }),
      );
      const resp = (await request.json()) as any;

      expect(request.status).toBe(201);
      expect(resp.success).toBe(true);
      expect(resp.result.id).toBe(42);
      expect(resp.result.title).toBe("New Item");
      expect(resp.result.passwordHash).toBeUndefined();
    });
  });
});
