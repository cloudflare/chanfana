import { Hono } from "hono";
import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { fromHono, fromIttyRouter } from "../../src";
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

    expect(t).toThrow("Route /todo don't have operationId set!");
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

    // Access schema via proxy (not in type definition but available at runtime)
    const schema = (router as any).schema;
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

    const schema = (router as any).schema;
    expect(schema.paths?.["/api/todo"]).toBeDefined();
    expect(schema.paths?.["/api/todo"]?.get).toBeDefined();
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

  it("hono with pre-existing basePath and chanfana base appends - route at combined path", async () => {
    // User sets basePath on Hono, then passes additional base to chanfana
    // Expected behavior: /api + /v1 = /api/v1
    const app = new Hono().basePath("/api");
    const router = fromHono(app, { base: "/v1" });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(new Request("http://localhost/api/v1/todo"));
    const resp = (await request.json()) as { msg: string };

    expect(request.status).toEqual(200);
    expect(resp.msg).toEqual("EndpointWithOperationId");
  });

  it("hono with pre-existing basePath and chanfana base appends - OpenAPI schema has combined path", async () => {
    const app = new Hono().basePath("/api");
    const router = fromHono(app, { base: "/v1" });
    router.get("/todo", EndpointWithOperationId);

    const schema = (router as any).schema;
    // Schema should show /api/v1/todo, not just /v1/todo
    expect(schema.paths?.["/api/v1/todo"]).toBeDefined();
    expect(schema.paths?.["/api/v1/todo"]?.get).toBeDefined();
    // Should NOT have /v1/todo (missing the pre-existing /api)
    expect(schema.paths?.["/v1/todo"]).toBeUndefined();
  });

  it("hono with pre-existing basePath and chanfana base appends - doc routes at combined path", async () => {
    const app = new Hono().basePath("/api");
    const router = fromHono(app, { base: "/v1" });
    router.get("/todo", EndpointWithOperationId);

    // openapi.json should be at /api/v1/openapi.json
    const openapiReq = await router.fetch(new Request("http://localhost/api/v1/openapi.json"));
    expect(openapiReq.status).toEqual(200);
    const openapiResp = (await openapiReq.json()) as { paths: Record<string, any> };
    expect(openapiResp.paths["/api/v1/todo"]).toBeDefined();

    // docs should be at /api/v1/docs and reference /api/v1/openapi.json
    const docsReq = await router.fetch(new Request("http://localhost/api/v1/docs"));
    expect(docsReq.status).toEqual(200);
    const docsHtml = await docsReq.text();
    expect(docsHtml).toContain("/api/v1/openapi.json");
  });

  it("hono with pre-existing basePath - options.base reflects effective base", async () => {
    const app = new Hono().basePath("/api");
    const router = fromHono(app, { base: "/v1" });

    // options.base should reflect the full effective base path
    expect(router.options.base).toEqual("/api/v1");
  });

  it("hono with pre-existing basePath only - options.base reflects Hono base", async () => {
    const app = new Hono().basePath("/api");
    const router = fromHono(app);

    // options.base should reflect the Hono base path even when no chanfana base is provided
    expect(router.options.base).toEqual("/api");
  });
});
