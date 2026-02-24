import { env } from "cloudflare:test";
import { Hono } from "hono";
import { AutoRouter } from "itty-router";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiException,
  D1UpdateEndpoint,
  fromHono,
  fromIttyRouter,
  InputValidationException,
  OpenAPIRoute,
  ReadEndpoint,
  UnprocessableEntityException,
} from "../../src";
import { contentJson } from "../../src/contentTypes";
import { getReDocUI, getSwaggerUI } from "../../src/ui";
import { OpenAPIRegistryMerger } from "../../src/zod/registry";
import { buildRequest } from "../utils";

// ---------------------------------------------------------------------------
// ui.ts coverage: getReDocUI()
// ---------------------------------------------------------------------------
describe("ReDoc UI", () => {
  it("should return valid HTML with the correct schema URL", () => {
    const html = getReDocUI("/openapi.json");

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("ReDocUI");
    expect(html).toContain('spec-url="/openapi.json"');
    expect(html).toContain("redoc.standalone.js");
  });

  it("should strip double and trailing slashes from schemaUrl", () => {
    const html = getReDocUI("/api//openapi.json/");

    // Double slash becomes single, trailing slash stripped
    expect(html).toContain('spec-url="/api/openapi.json"');
  });

  it("should also strip double slashes in getSwaggerUI", () => {
    // Verify parity with getSwaggerUI for the same sanitization
    const html = getSwaggerUI("/api//openapi.json");
    expect(html).toContain("url: '/api/openapi.json'");
  });
});

// ---------------------------------------------------------------------------
// parameters.ts coverage: duplicate query params, BigInt, Date coercion
// ---------------------------------------------------------------------------

// Endpoint with an array query parameter (for duplicate key test)
class ArrayQueryEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({
        tags: z.array(z.string()).optional(),
      }),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ tags: z.array(z.string()) })),
      },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return { tags: data.query.tags ?? [] };
  }
}

// Endpoint with BigInt query parameter
class BigIntQueryEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({
        value: z.bigint(),
      }),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ value: z.string() })),
      },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return { value: data.query.value.toString() };
  }
}

// Endpoint with Date query parameter
class DateQueryEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({
        date: z.date(),
      }),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson(z.object({ date: z.string() })),
      },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return { date: data.query.date.toISOString() };
  }
}

describe("Parameter Coercion - Duplicate Query Params", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/array-query", ArrayQueryEndpoint);

  it("should coerce duplicate query params into an array", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/array-query?tags=foo&tags=bar" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.tags).toEqual(["foo", "bar"]);
  });

  it("should wrap single value into array when schema expects array", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/array-query?tags=single" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.tags).toEqual(["single"]);
  });
});

describe("Parameter Coercion - BigInt", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/bigint-query", BigIntQueryEndpoint);

  it("should coerce string to BigInt for BigInt-typed query param", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/bigint-query?value=9007199254740993" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.value).toBe("9007199254740993");
  });
});

describe("Parameter Coercion - Date", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/date-query", DateQueryEndpoint);

  it("should coerce string to Date for Date-typed query param", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/date-query?date=2025-06-15T12:00:00Z" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.date).toBe("2025-06-15T12:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// exceptions.ts coverage: isVisible=false branches, no-message fallbacks
// ---------------------------------------------------------------------------
describe("Exception Branch Coverage", () => {
  it("InputValidationException buildResponse should return 'Internal Error' when isVisible is false", () => {
    const exc = new InputValidationException("secret details", ["body", "field"]);
    exc.isVisible = false;

    const response = exc.buildResponse();
    expect(response).toEqual([
      {
        code: 7001,
        message: "Internal Error",
        path: ["body", "field"],
      },
    ]);
  });

  it("UnprocessableEntityException buildResponse should use default_message when message is empty", () => {
    const exc = new UnprocessableEntityException();

    const response = exc.buildResponse();
    expect(response).toEqual([
      {
        code: 7007,
        message: "Unprocessable Entity",
        path: undefined,
      },
    ]);
  });

  it("UnprocessableEntityException buildResponse should return 'Internal Error' when isVisible is false", () => {
    const exc = new UnprocessableEntityException("secret");
    exc.isVisible = false;

    const response = exc.buildResponse();
    expect(response).toEqual([
      {
        code: 7007,
        message: "Internal Error",
        path: undefined,
      },
    ]);
  });

  it("ApiException buildResponse should use default_message when message is empty", () => {
    const exc = new ApiException();

    const response = exc.buildResponse();
    expect(response).toEqual([
      {
        code: 7000,
        message: "Internal Error",
      },
    ]);
  });

  it("ApiException buildResponse should return 'Internal Error' when isVisible is false", () => {
    const exc = new ApiException("secret stuff");
    exc.isVisible = false;

    const response = exc.buildResponse();
    expect(response).toEqual([
      {
        code: 7000,
        message: "Internal Error",
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// zod/registry.ts coverage: null/undefined registry guard
// ---------------------------------------------------------------------------
describe("OpenAPIRegistryMerger", () => {
  it("should handle merge with null registry", () => {
    const merger = new OpenAPIRegistryMerger();
    // Should not throw
    merger.merge(null as any);
    expect(merger._definitions).toEqual([]);
  });

  it("should handle merge with undefined registry", () => {
    const merger = new OpenAPIRegistryMerger();
    merger.merge(undefined as any);
    expect(merger._definitions).toEqual([]);
  });

  it("should handle merge with registry missing _definitions", () => {
    const merger = new OpenAPIRegistryMerger();
    merger.merge({} as any);
    expect(merger._definitions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// openapi.ts coverage: non-route handler passthrough, middleware proxy prop
// ---------------------------------------------------------------------------
describe("OpenAPI Handler - Middleware Proxy Property", () => {
  it("should return empty array when accessing .middleware on proxy", () => {
    const router = fromIttyRouter(AutoRouter());
    // Access the wrangler compatibility hack
    expect((router as any).middleware).toEqual([]);
  });

  it("should return empty array when accessing .middleware on Hono proxy", () => {
    const router = fromHono(new Hono());
    expect((router as any).middleware).toEqual([]);
  });
});

describe("OpenAPI Handler - Non-Route Handler Passthrough", () => {
  it("should pass non-route handlers through unchanged via Hono middleware", async () => {
    const router = fromHono(new Hono());

    class SimpleEndpoint extends OpenAPIRoute {
      schema = {
        responses: {
          "200": {
            description: "Success",
            ...contentJson(z.object({ ok: z.boolean() })),
          },
        },
      };

      async handle() {
        return { ok: true };
      }
    }

    // Register with a plain middleware function alongside the route
    // This exercises the `return handler` path (line 309 in openapi.ts)
    // when handler.isRoute is falsy
    const middlewareFn = async (c: any, next: any) => {
      await next();
    };

    (router as any).get("/with-middleware", middlewareFn, SimpleEndpoint);

    const request = await router.fetch(new Request("http://localhost/with-middleware"));
    const resp = (await request.json()) as { ok: boolean };

    expect(request.status).toEqual(200);
    expect(resp.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// route.ts coverage: default handle(), malformed JSON body
// ---------------------------------------------------------------------------
describe("OpenAPIRoute Default Handle", () => {
  it("should throw 'Method not implemented' when handle() is not overridden", async () => {
    // Create a route class that does not override handle()
    class NoHandleEndpoint extends OpenAPIRoute {
      schema = {
        responses: {
          "200": {
            description: "Success",
          },
        },
      };
      // Intentionally no handle() override
    }

    const router = fromIttyRouter(AutoRouter());
    router.get("/no-handle", NoHandleEndpoint);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/no-handle" }));

    // The error is thrown but caught by execute() - since it's not a chanfana error,
    // it will be re-thrown and itty-router will handle it
    expect(request.status).toEqual(500);
  });
});

describe("Malformed JSON Body", () => {
  class BodyEndpoint extends OpenAPIRoute {
    schema = {
      request: {
        body: contentJson(
          z.object({
            name: z.string(),
          }),
        ),
      },
      responses: {
        "200": {
          description: "Success",
          ...contentJson(z.object({ name: z.string() })),
        },
      },
    };

    async handle() {
      const validated = await this.getValidatedData<typeof this.schema>();
      return { name: validated.body.name };
    }
  }

  it("should handle malformed JSON by storing empty body for Zod validation", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.post("/body-endpoint", BodyEndpoint);

    // Send invalid JSON body - this will trigger the catch in getUnvalidatedData()
    const request = await router.fetch(
      new Request("https://example.com/body-endpoint", {
        method: "POST",
        body: "this is not json{{{",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const resp = await request.json();

    // Should get a validation error since the body couldn't be parsed
    expect(request.status).toEqual(400);
    expect(resp.success).toBe(false);
    expect(resp.errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// adapters/hono.ts coverage: .on() method, getBindings, non-function proxy prop
// ---------------------------------------------------------------------------
describe("Hono Adapter - .on() Method", () => {
  class SimpleEndpoint extends OpenAPIRoute {
    schema = {
      responses: {
        "200": {
          description: "Success",
          ...contentJson(z.object({ method: z.string() })),
        },
      },
    };

    async handle() {
      return { method: "on" };
    }
  }

  it("should register routes via hono.on(method, path, EndpointClass)", async () => {
    const router = fromHono(new Hono());
    router.on("GET", "/on-route", SimpleEndpoint);

    const request = await router.fetch(new Request("http://localhost/on-route"));
    const resp = (await request.json()) as { method: string };

    expect(request.status).toEqual(200);
    expect(resp.method).toBe("on");
  });

  it("should register POST routes via hono.on()", async () => {
    const router = fromHono(new Hono());

    class PostEndpoint extends OpenAPIRoute {
      schema = {
        request: {
          body: contentJson(z.object({ data: z.string() })),
        },
        responses: {
          "200": {
            description: "Success",
            ...contentJson(z.object({ received: z.string() })),
          },
        },
      };

      async handle() {
        const d = await this.getValidatedData<typeof this.schema>();
        return { received: d.body.data };
      }
    }

    router.on("POST", "/on-post", PostEndpoint);

    const request = await router.fetch(
      new Request("http://localhost/on-post", {
        method: "POST",
        body: JSON.stringify({ data: "hello" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const resp = (await request.json()) as { received: string };

    expect(request.status).toEqual(200);
    expect(resp.received).toBe("hello");
  });

  it("should include .on() routes in OpenAPI schema", async () => {
    const router = fromHono(new Hono());
    router.on("GET", "/on-schema", SimpleEndpoint);

    const schema = router.schema;
    expect(schema.paths?.["/on-schema"]).toBeDefined();
    expect(schema.paths?.["/on-schema"]?.get).toBeDefined();
  });
});

describe("Hono Adapter - Non-function Proxy Property", () => {
  it("should access non-function properties on the Hono proxy", () => {
    const router = fromHono(new Hono());

    // Hono routers have non-function properties - accessing them should
    // return the original property value through the proxy
    expect((router as any).routes).toBeDefined();
  });
});

describe("Hono Adapter - ReDoc Route", () => {
  it("should serve ReDoc UI at /redocs", async () => {
    const router = fromHono(new Hono());

    class DummyEndpoint extends OpenAPIRoute {
      schema = {
        responses: { "200": { description: "OK" } },
      };
      async handle() {
        return { ok: true };
      }
    }

    router.get("/test", DummyEndpoint);

    const request = await router.fetch(new Request("http://localhost/redocs"));
    const html = await request.text();

    expect(request.status).toEqual(200);
    expect(request.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("ReDocUI");
    expect(html).toContain("redoc.standalone.js");
  });
});

// ---------------------------------------------------------------------------
// endpoints/read.ts coverage: primary key mismatch error
// ---------------------------------------------------------------------------
describe("ReadEndpoint - Primary Key Mismatch", () => {
  it("should throw when primaryKeys differ from URL params without pathParameters", () => {
    const router = fromIttyRouter(AutoRouter());

    class MismatchedReadEndpoint extends ReadEndpoint {
      _meta = {
        model: {
          tableName: "items",
          schema: z.object({
            compositeA: z.string(),
            compositeB: z.string(),
            name: z.string(),
          }),
          primaryKeys: ["compositeA", "compositeB"],
        },
      };
    }

    // Register at a route with only one path param but two primary keys
    // This will trigger getSchema() which checks the mismatch
    expect(() => {
      router.get("/items/:compositeA", MismatchedReadEndpoint);
    }).toThrow("Model primaryKeys differ from urlParameters");
  });
});

// ---------------------------------------------------------------------------
// endpoints/d1/update.ts coverage: empty update body
// ---------------------------------------------------------------------------
describe("D1UpdateEndpoint - Empty Update Body", () => {
  const UserSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    email: z.string(),
    age: z.number().optional(),
  });

  // Custom endpoint that overrides before() to strip all update fields.
  // This exercises the defensive `updateColumns.length === 0` early-return path
  // in D1UpdateEndpoint.update() (line 97-98).
  class EmptyUpdateEndpoint extends D1UpdateEndpoint {
    _meta = {
      model: {
        tableName: "users",
        schema: UserSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";

    async before(_oldObj: any, filters: any) {
      // Clear all update data - simulating a before hook that strips fields
      return { ...filters, updatedData: {} };
    }
  }

  const router = fromIttyRouter(AutoRouter({ base: "/api" }), { base: "/api" });
  router.put("/users/:id", EmptyUpdateEndpoint);

  beforeEach(async () => {
    await env.DB.prepare("DROP TABLE IF EXISTS users").run();
    await env.DB.prepare(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        age INTEGER
      )
    `).run();
    await env.DB.prepare("INSERT INTO users (name, email, age) VALUES ('Alice', 'alice@example.com', 25)").run();
  });

  it("should skip SQL UPDATE when before() clears all update fields", async () => {
    const response = await router.fetch(
      new Request("https://example.com/api/users/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Bob", email: "bob@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );
    const resp = await response.json();

    // The request succeeds - the early-return path is exercised (no SQL UPDATE runs)
    expect(response.status).toBe(200);
    expect(resp.success).toBe(true);

    // Verify the database was NOT modified (the UPDATE was skipped)
    const dbRecord = await env.DB.prepare("SELECT * FROM users WHERE id = 1").first();
    expect(dbRecord?.name).toBe("Alice");
    expect(dbRecord?.email).toBe("alice@example.com");
  });
});
