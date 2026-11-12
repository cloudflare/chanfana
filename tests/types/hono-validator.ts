// Compile-time only: checks the types of middleware chained before an endpoint with chanfanaValidator() (#84, #273).
import { Hono, type MiddlewareHandler } from "hono";
import { hc, type InferRequestType } from "hono/client";
import { expectTypeOf } from "vitest";
import { z } from "zod";
import {
  chanfanaValidator,
  contentJson,
  fromHono,
  OpenAPIRoute,
  type OpenAPIRouteHonoValidatedInput,
  type OpenAPIRouteSchema,
} from "../../src";

type Bindings = { DB: D1Database; SECRET: string };
type User = { id: string; admin: boolean };

const authMw: MiddlewareHandler<{ Variables: { user: User } }> = async (c, next) => {
  c.set("user", { id: "1", admin: true });
  await next();
};

const requestIdMw: MiddlewareHandler<{ Variables: { requestId: string } }> = async (c, next) => {
  c.set("requestId", "abc");
  await next();
};

export class CreateUser extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({ org: z.coerce.number() }),
      query: z.object({ notify: z.boolean().default(false) }),
      headers: z.object({ "x-tenant": z.string() }),
      body: contentJson(z.object({ name: z.string(), role: z.enum(["admin", "member"]).default("member") })),
    },
  };

  async handle() {
    return {};
  }
}

export class SearchUsers extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({ q: z.string(), limit: z.number().default(10) }),
      body: contentJson(z.object({ ignored: z.string() })),
    },
  };

  async handle() {
    return {};
  }
}

export class WideSchema extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = { request: { query: z.object({ q: z.string() }) } };

  async handle() {
    return {};
  }
}

type CreateBody = { name: string; role: "admin" | "member" };

const app = new Hono<{ Bindings: Bindings }>();
const openapi = fromHono(app);

// A middleware before an endpoint class compiles (#273)
openapi.post("/users", authMw, CreateUser);
openapi.get("/protected", async (_c, next) => next(), SearchUsers);

// After the marker, c.req.valid() gives the endpoint's validated (Zod output) data, and c.env stays typed
openapi.post(
  "/orgs/:org/users",
  authMw,
  chanfanaValidator(),
  async (c, next) => {
    expectTypeOf(c.req.valid("json")).toEqualTypeOf<CreateBody>();
    expectTypeOf(c.req.valid("query")).toEqualTypeOf<{ notify: boolean }>();
    expectTypeOf(c.req.valid("param")).toEqualTypeOf<{ org: number }>();
    expectTypeOf(c.req.valid("header")).toEqualTypeOf<{ "x-tenant": string }>();
    expectTypeOf(c.env).toEqualTypeOf<Bindings>();
    expectTypeOf(c.get("user")).toEqualTypeOf<User>();
    await next();
  },
  CreateUser,
);

// Before the marker the data isn't validated yet
openapi.post(
  "/orgs/:org/users",
  async (c, next) => {
    // @ts-expect-error valid() is only typed after chanfanaValidator()
    c.req.valid("json");
    await next();
  },
  chanfanaValidator(),
  CreateUser,
);

// Without the marker valid() isn't available either
openapi.post(
  "/orgs/:org/users",
  authMw,
  async (c, next) => {
    // @ts-expect-error no chanfanaValidator() in this route
    c.req.valid("json");
    await next();
  },
  CreateUser,
);

// The validated input carries over to later middleware, along with each middleware's Variables
openapi.put(
  "/orgs/:org/users",
  chanfanaValidator(),
  requestIdMw,
  async (c, next) => {
    expectTypeOf(c.req.valid("json")).toEqualTypeOf<CreateBody>();
    expectTypeOf(c.get("requestId")).toEqualTypeOf<string>();
    expectTypeOf(c.env).toEqualTypeOf<Bindings>();
    await next();
  },
  CreateUser,
);

// GET routes have no JSON body
openapi.get(
  "/search",
  chanfanaValidator(),
  async (c, next) => {
    expectTypeOf(c.req.valid("query")).toEqualTypeOf<{ q: string; limit: number }>();
    // @ts-expect-error GET routes don't validate a JSON body
    c.req.valid("json");
    await next();
  },
  SearchUsers,
);

// Endpoints with a non-literal schema can't be typed, valid() falls back to any
openapi.delete(
  "/wide",
  chanfanaValidator(),
  async (c, next) => {
    expectTypeOf(c.req.valid("query")).toBeAny();
    await next();
  },
  WideSchema,
);

// Five middleware are still typed
openapi.patch(
  "/orgs/:org/users",
  authMw,
  requestIdMw,
  chanfanaValidator(),
  async (_c, next) => next(),
  async (c, next) => {
    expectTypeOf(c.req.valid("json")).toEqualTypeOf<CreateBody>();
    expectTypeOf(c.get("user")).toEqualTypeOf<User>();
    expectTypeOf(c.get("requestId")).toEqualTypeOf<string>();
    await next();
  },
  CreateUser,
);

// More than five middleware fall back to untyped handlers
openapi.post(
  "/orgs/:org/users",
  authMw,
  requestIdMw,
  async (_c, next) => next(),
  async (_c, next) => next(),
  chanfanaValidator(),
  async (c, next) => {
    expectTypeOf(c.req.valid("json")).toBeAny();
    await next();
  },
  CreateUser,
);

// all() and on() accept middleware too
openapi.all(
  "/orgs/:org/users",
  chanfanaValidator(),
  async (c, next) => {
    expectTypeOf(c.req.valid("json")).toEqualTypeOf<CreateBody>();
    await next();
  },
  CreateUser,
);
openapi.on("POST", "/orgs/:org/users", authMw, chanfanaValidator(), CreateUser);

// Plain Hono handlers keep Hono's own types
openapi.post("/plain", authMw, (c) => {
  expectTypeOf(c.get("user")).toEqualTypeOf<User>();
  return c.json({ ok: true });
});
openapi.get(
  "/plain",
  async (_c, next) => next(),
  async (_c, next) => next(),
  (c) => c.text("ok"),
);

// Routes with middleware still reach Hono's RPC client, with the same input as without middleware
const routes = fromHono(new Hono()).post("/orgs/:org/users", authMw, chanfanaValidator(), CreateUser);
const plainRoutes = fromHono(new Hono()).post("/orgs/:org/users", CreateUser);
const client = hc<typeof routes>("http://localhost");
const plainClient = hc<typeof plainRoutes>("http://localhost");
type ClientInput = InferRequestType<(typeof client.orgs)[":org"]["users"]["$post"]>;
expectTypeOf<ClientInput>().toEqualTypeOf<InferRequestType<(typeof plainClient.orgs)[":org"]["users"]["$post"]>>();
expectTypeOf<ClientInput["param"]>().toEqualTypeOf<{ org: string }>();

// The exported helper type
expectTypeOf<OpenAPIRouteHonoValidatedInput<typeof SearchUsers, "post">["out"]>().toEqualTypeOf<{
  query: { q: string; limit: number };
  json: { ignored: string };
}>();
expectTypeOf<OpenAPIRouteHonoValidatedInput<typeof SearchUsers, "get">["out"]>().toEqualTypeOf<{
  query: { q: string; limit: number };
}>();
