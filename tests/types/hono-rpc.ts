// Compile-time only: checks that routes chained on fromHono() expose typed routes to Hono's RPC client (#215).
import { Hono } from "hono";
import { hc, type InferRequestType, type InferResponseType } from "hono/client";
import { expectTypeOf } from "vitest";
import { z } from "zod";
import { contentJson, CreateEndpoint, fromHono, OpenAPIRoute, type OpenAPIRouteSchema } from "../../src";

const Task = z.object({ id: z.number(), name: z.string(), done: z.boolean() });

export class TaskFetch extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({ id: z.coerce.number() }),
      query: z.object({ verbose: z.boolean().optional(), format: z.enum(["full", "short"]) }),
      headers: z.object({ "x-tenant": z.string() }),
    },
    responses: {
      "200": { description: "ok", content: { "application/json": { schema: z.object({ task: Task }) } } },
      "404": { description: "missing", content: { "application/json": { schema: z.object({ error: z.string() }) } } },
    },
  };

  async handle() {
    return { task: { id: 1, name: "x", done: false } };
  }
}

export class TaskCreate extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson(z.object({ name: z.string(), done: z.boolean().default(false) })),
    },
    responses: {
      "201": { description: "created", ...contentJson(Task) },
    },
  };

  async handle() {
    return { id: 1, name: "x", done: false };
  }
}

export class TaskUpdate extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { "application/json": { schema: z.object({ done: z.boolean().default(false) }) } } },
    },
  };

  async handle() {
    return {};
  }
}

export class WideSchemaEndpoint extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    request: { query: z.object({ q: z.string() }) },
  };

  async handle() {
    return {};
  }
}

export class NoSchemaEndpoint extends OpenAPIRoute {
  async handle() {
    return {};
  }
}

const app = new Hono();
const openapi = fromHono(app);
const routes = openapi
  .get("/tasks/:id", TaskFetch)
  .post("/tasks", TaskCreate)
  .patch("/tasks/:id", TaskUpdate)
  .delete("/wide", WideSchemaEndpoint)
  .put("/none/:slug", NoSchemaEndpoint)
  .all("/handler", (c) => c.text("hi"));

export type AppType = typeof routes;

const client = hc<AppType>("http://localhost");

// GET /tasks/:id: params, query and headers as strings, typed per-status JSON output
type FetchReq = InferRequestType<(typeof client.tasks)[":id"]["$get"]>;
expectTypeOf<FetchReq>().toEqualTypeOf<{
  param: { id: string };
  query: { verbose?: string | undefined; format: "full" | "short" };
  header: { "x-tenant": string };
}>();
expectTypeOf<InferResponseType<(typeof client.tasks)[":id"]["$get"], 200>>().toEqualTypeOf<{
  task: { id: number; name: string; done: boolean };
}>();
expectTypeOf<InferResponseType<(typeof client.tasks)[":id"]["$get"], 404>>().toEqualTypeOf<{ error: string }>();

// POST /tasks: JSON body from contentJson() and output from a non-200 status
expectTypeOf<InferRequestType<typeof client.tasks.$post>>().toEqualTypeOf<{
  json: { name: string; done: boolean };
}>();
expectTypeOf<InferResponseType<typeof client.tasks.$post, 201>>().toEqualTypeOf<{
  id: number;
  name: string;
  done: boolean;
}>();

// PATCH /tasks/:id: JSON body uses the Zod input type (defaults are optional)
expectTypeOf<InferRequestType<(typeof client.tasks)[":id"]["$patch"]>>().toEqualTypeOf<{
  param: { id: string };
  json: { done?: boolean | undefined };
}>();

// A request part whose fields are all optional can be omitted
export class OptionalQueryEndpoint extends OpenAPIRoute {
  schema = { request: { query: z.object({ page: z.number().optional() }) } };

  async handle() {
    return {};
  }
}
const optional = fromHono(new Hono()).get("/list", OptionalQueryEndpoint);
expectTypeOf<InferRequestType<ReturnType<typeof hc<typeof optional>>["list"]["$get"]>>().toEqualTypeOf<{
  query?: { page?: string | undefined };
}>();

// Non-literal schemas and schema-less endpoints keep Hono's untyped defaults
expectTypeOf<keyof InferRequestType<typeof client.wide.$delete>>().toBeNever();
expectTypeOf<InferRequestType<(typeof client.none)[":slug"]["$put"]>>().toEqualTypeOf<{ param: { slug: string } }>();
expectTypeOf(client.handler.$get).toBeFunction();

// The returned router is still a chanfana router
expectTypeOf(routes.schema).toBeAny();
expectTypeOf(routes.original).toEqualTypeOf<Hono>();

// Base paths, typed envs and nested routers keep the inferred routes
const based = fromHono(new Hono<{ Bindings: { DB: D1Database } }>().basePath("/api")).get("/tasks/:id", TaskFetch);
const basedClient = hc<typeof based>("http://localhost");
expectTypeOf<InferResponseType<(typeof basedClient.api.tasks)[":id"]["$get"], 200>>().toEqualTypeOf<{
  task: { id: number; name: string; done: boolean };
}>();

const inner = fromHono(new Hono()).post("/tasks", TaskCreate);
const outer = fromHono(new Hono()).get("/tasks/:id", TaskFetch).route("/v1", inner).route("/v3", inner);
const outerClient = hc<typeof outer>("http://localhost");
expectTypeOf<InferRequestType<typeof outerClient.v1.tasks.$post>>().toEqualTypeOf<{
  json: { name: string; done: boolean };
}>();
expectTypeOf<InferRequestType<typeof outerClient.v3.tasks.$post>>().toEqualTypeOf<{
  json: { name: string; done: boolean };
}>();
expectTypeOf<InferResponseType<(typeof outerClient.tasks)[":id"]["$get"], 404>>().toEqualTypeOf<{ error: string }>();

const plainOuter = new Hono().route("/v2", inner);
const plainOuterClient = hc<typeof plainOuter>("http://localhost");
expectTypeOf<InferResponseType<typeof plainOuterClient.v2.tasks.$post, 201>>().toEqualTypeOf<{
  id: number;
  name: string;
  done: boolean;
}>();

// Auto endpoints build their schema at runtime, so they keep Hono's untyped defaults
class TaskAutoCreate extends CreateEndpoint {
  _meta = { model: { schema: Task, primaryKeys: ["id"], tableName: "tasks" } };
}
const auto = fromHono(new Hono()).post("/auto", TaskAutoCreate);
const autoClient = hc<typeof auto>("http://localhost");
expectTypeOf<keyof InferRequestType<typeof autoClient.auto.$post>>().toBeNever();
