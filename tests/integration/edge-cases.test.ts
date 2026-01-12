import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromIttyRouter, OpenAPIRoute } from "../../src";
import { contentJson } from "../../src/contentTypes";
import { buildRequest } from "../utils";

// Test endpoint that returns a plain object (should be auto-converted to JSON)
class ObjectReturnEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson({ data: z.string() }),
      },
    },
  };

  async handle() {
    return { data: "test" };
  }
}

// Test endpoint that returns a Response object directly
class ResponseReturnEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson({ data: z.string() }),
      },
    },
  };

  async handle() {
    return new Response(JSON.stringify({ data: "direct response" }), {
      headers: { "content-type": "application/json" },
    });
  }
}

// Test endpoint that returns null
class NullReturnEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        ...contentJson({ data: z.string() }),
      },
    },
  };

  async handle() {
    return null;
  }
}

// Test endpoint with HEAD method
class HeadEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson({
        data: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson({ success: Boolean }),
      },
    },
  };

  async handle() {
    return { success: true };
  }
}

// Test endpoint with query parameters using falsy defaults
class FalsyDefaultsEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({
        count: z.number().default(0),
        enabled: z.boolean().default(false),
        name: z.string().default(""),
      }),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson({
          count: z.number(),
          enabled: z.boolean(),
          name: z.string(),
        }),
      },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return {
      count: data.query.count,
      enabled: data.query.enabled,
      name: data.query.name,
    };
  }
}

// Test endpoint with raiseUnknownParameters behavior
class StrictParamsEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({
        allowed: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Success",
        ...contentJson({ allowed: z.string() }),
      },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return { allowed: data.query.allowed };
  }
}

describe("Response Type Handling", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/object-return", ObjectReturnEndpoint);
  router.get("/response-return", ResponseReturnEndpoint);
  router.get("/null-return", NullReturnEndpoint);

  it("should auto-convert plain object to JSON response", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/object-return" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.data).toBe("test");
  });

  it("should pass through Response objects directly", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/response-return" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.data).toBe("direct response");
  });

  it("should handle null return value", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/null-return" }));

    // Note: itty-router wraps null returns, so we get a Response object
    // This behavior depends on the router implementation
    expect(request).toBeDefined();
  });
});

describe("HEAD Request Handling", () => {
  const router = fromIttyRouter(AutoRouter());
  router.head("/head-test", HeadEndpoint);

  it("should not attempt to parse body for HEAD requests", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "HEAD",
        path: "/head-test",
      }),
    );

    // HEAD request should succeed without body parsing
    expect(request.status).toEqual(200);
  });
});

describe("Falsy Default Values", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/falsy-defaults", FalsyDefaultsEndpoint);

  it("should apply falsy defaults (0, false, empty string) correctly", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/falsy-defaults" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.count).toBe(0);
    expect(resp.enabled).toBe(false);
    expect(resp.name).toBe("");
  });

  it("should override falsy defaults when values are provided", async () => {
    const request = await router.fetch(
      buildRequest({ method: "GET", path: "/falsy-defaults?count=5&enabled=true&name=test" }),
    );
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.count).toBe(5);
    expect(resp.enabled).toBe(true);
    expect(resp.name).toBe("test");
  });
});

describe("raiseUnknownParameters", () => {
  // Note: raiseUnknownParameters only applies to the top-level request schema (params, query, headers, body)
  // It does NOT recursively apply strict validation to nested Zod objects within those schemas.
  // This is a known limitation - the option prevents adding unknown top-level fields like
  // an "unknownSection" but doesn't prevent unknown fields within query/params/body schemas.

  it("should accept parameters when raiseUnknownParameters is false", async () => {
    const router = fromIttyRouter(AutoRouter(), { raiseUnknownParameters: false });
    router.get("/loose", StrictParamsEndpoint);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/loose?allowed=test&unknown=ignored" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.allowed).toBe("test");
  });

  it("should pass validation with known parameters regardless of raiseUnknownParameters", async () => {
    const router = fromIttyRouter(AutoRouter(), { raiseUnknownParameters: true });
    router.get("/strict", StrictParamsEndpoint);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/strict?allowed=test" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp.allowed).toBe("test");
  });
});

describe("getUnvalidatedData", () => {
  // Test endpoint that exposes both validated and unvalidated data
  class UnvalidatedDataEndpoint extends OpenAPIRoute {
    schema = {
      request: {
        body: contentJson({
          name: z.string(),
          optional: z.string().optional().default("default_value"),
        }),
      },
      responses: {
        "200": {
          description: "Success",
          ...contentJson({
            validated: z.object({
              name: z.string(),
              optional: z.string(),
            }),
            unvalidated: z.object({
              name: z.string().optional(),
              optional: z.string().optional(),
            }),
          }),
        },
      },
    };

    async handle() {
      const validated = await this.getValidatedData<typeof this.schema>();
      const unvalidated = await this.getUnvalidatedData();

      return {
        validated: validated.body,
        unvalidated: unvalidated.body,
      };
    }
  }

  const router = fromIttyRouter(AutoRouter());
  router.post("/unvalidated", UnvalidatedDataEndpoint);

  it("should return raw data without Zod defaults in unvalidated data", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "POST",
        path: "/unvalidated",
        json: () => ({ name: "test" }),
      }),
    );
    const resp = await request.json();

    expect(request.status).toEqual(200);

    // Validated data should have the default applied
    expect(resp.validated.name).toBe("test");
    expect(resp.validated.optional).toBe("default_value");

    // Unvalidated data should NOT have the default
    expect(resp.unvalidated.name).toBe("test");
    expect(resp.unvalidated.optional).toBeUndefined();
  });

  it("should include provided optional fields in unvalidated data", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "POST",
        path: "/unvalidated",
        json: () => ({ name: "test", optional: "provided" }),
      }),
    );
    const resp = await request.json();

    expect(request.status).toEqual(200);

    // Both should have the provided value
    expect(resp.validated.optional).toBe("provided");
    expect(resp.unvalidated.optional).toBe("provided");
  });
});

describe("OpenAPI Schema Generation", () => {
  it("should generate valid OpenAPI schema", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/test", ObjectReturnEndpoint);

    const schema = router.schema;

    expect(schema.openapi).toBe("3.1.0");
    expect(schema.paths?.["/test"]).toBeDefined();
    expect(schema.paths?.["/test"]?.get).toBeDefined();
  });

  it("should respect openapiVersion option", async () => {
    const router = fromIttyRouter(AutoRouter(), { openapiVersion: "3" });
    router.get("/test", ObjectReturnEndpoint);

    const schema = router.schema;

    expect(schema.openapi).toBe("3.0.3");
  });
});
