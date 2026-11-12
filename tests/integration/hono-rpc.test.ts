import { Hono } from "hono";
import { hc } from "hono/client";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { contentJson, fromHono, NotFoundException, OpenAPIRoute } from "../../src";

const Task = z.object({ id: z.number(), name: z.string(), done: z.boolean() });

class RpcTaskFetchEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({ id: z.number() }),
      query: z.object({ verbose: z.boolean().optional() }),
      headers: z.object({ "x-tenant": z.string() }),
    },
    responses: {
      "200": { description: "ok", ...contentJson(z.object({ task: Task, tenant: z.string(), verbose: z.boolean() })) },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    if (data.params.id === 404) {
      throw new NotFoundException();
    }
    return {
      task: { id: data.params.id, name: "task", done: false },
      tenant: data.headers["x-tenant"],
      verbose: data.query.verbose ?? false,
    };
  }
}

class RpcTaskCreateEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson(z.object({ name: z.string(), done: z.boolean() })),
    },
    responses: {
      "201": { description: "created", ...contentJson(Task) },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return Response.json({ id: 1, ...data.body }, { status: 201 });
  }
}

class RpcDateEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": { description: "ok", ...contentJson(z.object({ createdAt: z.date() })) },
    },
  };

  async handle() {
    return { createdAt: new Date("2026-01-02T03:04:05.000Z") };
  }
}

function buildApp() {
  const app = new Hono();
  const openapi = fromHono(app);
  const routes = openapi
    .get("/tasks/:id", RpcTaskFetchEndpoint)
    .post("/tasks", RpcTaskCreateEndpoint)
    .get("/date", RpcDateEndpoint);
  const client = hc<typeof routes>("http://localhost", { fetch: app.request });
  return { app, client };
}

describe("Hono RPC client", () => {
  it("sends params, query and headers to a GET endpoint", async () => {
    const { client } = buildApp();

    const res = await client.tasks[":id"].$get({
      param: { id: "7" },
      query: { verbose: "true" },
      header: { "x-tenant": "acme" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ task: { id: 7, name: "task", done: false }, tenant: "acme", verbose: true });
  });

  it("sends a JSON body to a POST endpoint", async () => {
    const { client } = buildApp();

    const res = await client.tasks.$post({ json: { name: "write docs", done: true } });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1, name: "write docs", done: true });
  });

  it("types dates as the strings received over the wire", async () => {
    const { client } = buildApp();

    const res = await client.date.$get();
    const body = await res.json();
    const createdAt: string = body.createdAt;

    expect(createdAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("returns chanfana validation errors", async () => {
    const { client } = buildApp();

    const res = await client.tasks.$post({ json: { name: "missing done" } as { name: string; done: boolean } });

    expect(res.status).toBe(400);
    const body = (await res.json()) as unknown as { success: boolean; errors: Array<{ code: number }> };
    expect(body.success).toBe(false);
    expect(body.errors[0]?.code).toBe(7001);
  });

  it("returns chanfana exceptions", async () => {
    const { client } = buildApp();

    const res = await client.tasks[":id"].$get({ param: { id: "404" }, header: { "x-tenant": "acme" } });

    expect(res.status).toBe(404);
  });

  it("keeps the OpenAPI schema for routes registered through the chain", async () => {
    const { app } = buildApp();

    const res = await app.request("/openapi.json");
    const schema = (await res.json()) as { paths: Record<string, unknown> };

    expect(Object.keys(schema.paths)).toEqual(["/tasks/{id}", "/tasks", "/date"]);
  });
});
