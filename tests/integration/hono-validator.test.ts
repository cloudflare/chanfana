import { env } from "cloudflare:test";
import { type Context, Hono, type MiddlewareHandler, type Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { AutoRouter } from "itty-router";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiException,
  chanfanaValidator,
  contentJson,
  D1UpdateEndpoint,
  fromHono,
  fromIttyRouter,
  OpenAPIRoute,
  type OpenAPIRouteSchema,
} from "../../src";

let validateRequestCalls = 0;

class CreateUserEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({ org: z.number() }),
      query: z.object({ notify: z.boolean().default(false), page: z.number().optional() }),
      headers: z.object({ "x-tenant": z.string() }),
      body: contentJson(z.object({ name: z.string(), age: z.number(), role: z.string().default("member") })),
    },
  };

  override async validateRequest(request: Request) {
    validateRequestCalls++;
    return super.validateRequest(request);
  }

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    const raw = await this.getUnvalidatedData();
    return { data, rawBody: raw.body };
  }
}

class SearchEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      query: z.object({ q: z.string(), limit: z.number().default(10) }),
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return { query: data.query };
  }
}

class GetterSchemaEndpoint extends OpenAPIRoute {
  override getSchema(): OpenAPIRouteSchema {
    return {
      request: {
        body: contentJson(z.object({ title: z.string().default("untitled") })),
      },
    };
  }

  async handle() {
    const data = await this.getValidatedData();
    return { body: data.body };
  }
}

class LazyEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson(z.object({ name: z.string() })),
    },
  };

  async handle(c: Context) {
    // Validates lazily, after reading the body itself
    const text = await c.req.text();
    return { text };
  }
}

class CustomErrorEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson(z.object({ name: z.string() })),
    },
  };

  protected override handleError(error: unknown): unknown {
    if (error instanceof ApiException) {
      return new Error("wrapped by handleError");
    }
    return error;
  }

  async handle() {
    await this.getValidatedData();
    return { ok: true };
  }
}

const validHeaders = { "content-type": "application/json", "x-tenant": "acme" };
const validBody = JSON.stringify({ name: "Ana", age: "not-a-number-is-invalid" });

function postUser(app: { request: Hono["request"] }, path: string, body: unknown, headers = validHeaders) {
  return app.request(path, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function captureValid(store: Record<string, unknown>): MiddlewareHandler {
  return async (c, next) => {
    store.json = c.req.valid("json" as never);
    store.query = c.req.valid("query" as never);
    store.param = c.req.valid("param" as never);
    store.header = c.req.valid("header" as never);
    await next();
  };
}

describe("chanfanaValidator()", () => {
  beforeEach(() => {
    validateRequestCalls = 0;
  });

  it("exposes coerced and defaulted data to middleware after the marker", async () => {
    const seen: Record<string, unknown> = {};
    const app = new Hono();
    fromHono(app).post("/orgs/:org/users", chanfanaValidator(), captureValid(seen), CreateUserEndpoint);

    const res = await postUser(app, "/orgs/42/users?page=3", { name: "Ana", age: 30 });
    expect(res.status).toBe(200);

    expect(seen.json).toEqual({ name: "Ana", age: 30, role: "member" });
    expect(seen.query).toEqual({ notify: false, page: 3 });
    expect(seen.param).toEqual({ org: 42 });
    expect(seen.header).toEqual({ "x-tenant": "acme" });

    const resp = (await res.json()) as any;
    expect(resp.data.body).toEqual({ name: "Ana", age: 30, role: "member" });
    expect(resp.rawBody).toEqual({ name: "Ana", age: 30 });
  });

  it("leaves c.req.valid() empty for middleware before the marker", async () => {
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const app = new Hono();
    fromHono(app).post(
      "/orgs/:org/users",
      captureValid(before),
      chanfanaValidator(),
      captureValid(after),
      CreateUserEndpoint,
    );

    const res = await postUser(app, "/orgs/1/users", { name: "Ana", age: 30 });
    expect(res.status).toBe(200);
    expect(before).toEqual({ json: undefined, query: undefined, param: undefined, header: undefined });
    expect(after.json).toEqual({ name: "Ana", age: 30, role: "member" });
  });

  it("validates the request only once", async () => {
    const app = new Hono();
    fromHono(app).post("/orgs/:org/users", chanfanaValidator(), CreateUserEndpoint);

    const res = await postUser(app, "/orgs/1/users", { name: "Ana", age: 30 });
    expect(res.status).toBe(200);
    expect(validateRequestCalls).toBe(1);
  });

  it("skips the rest of the chain when validation fails", async () => {
    let reached = false;
    const app = new Hono();
    fromHono(app).post(
      "/orgs/:org/users",
      chanfanaValidator(),
      async (_c, next) => {
        reached = true;
        await next();
      },
      CreateUserEndpoint,
    );

    const res = await postUser(app, "/orgs/1/users", validBody);
    expect(res.status).toBe(400);
    expect(reached).toBe(false);
    expect(validateRequestCalls).toBe(1);
  });

  describe("error parity with routes without the marker", () => {
    async function compare(setup: (app: Hono) => void, path = "/orgs/1/users") {
      const plainApp = new Hono();
      setup(plainApp);
      fromHono(plainApp).post("/orgs/:org/users", CreateUserEndpoint);

      const markedApp = new Hono();
      setup(markedApp);
      fromHono(markedApp).post("/orgs/:org/users", chanfanaValidator(), CreateUserEndpoint);

      const plain = await postUser(plainApp, path, validBody);
      const marked = await postUser(markedApp, path, validBody);

      expect(marked.status).toBe(plain.status);
      expect(marked.headers.get("content-type")).toBe(plain.headers.get("content-type"));
      const markedBody = await marked.text();
      expect(markedBody).toBe(await plain.text());
      return { status: marked.status, body: markedBody };
    }

    it("returns the same 400 response by default", async () => {
      const { status, body } = await compare(() => {});
      expect(status).toBe(400);
      const parsed = JSON.parse(body);
      expect(parsed.success).toBe(false);
      expect(parsed.errors[0].code).toBe(7001);
    });

    it("goes through a custom onError the same way", async () => {
      const { status, body } = await compare((app) => {
        app.onError((err, c) => {
          const isHttp = err instanceof HTTPException;
          return c.json({ custom: true, isHttp, status: isHttp ? err.status : 500 }, 418);
        });
      });
      expect(status).toBe(418);
      expect(JSON.parse(body)).toEqual({ custom: true, isHttp: true, status: 400 });
    });

    it("passes raw errors through with passthroughErrors", async () => {
      const errors: Record<string, unknown> = {};
      const build = (marked: boolean) => {
        const app = new Hono();
        app.onError((err, c) => {
          errors[marked ? "marked" : "plain"] = err;
          return c.json({ name: err.constructor.name }, 499 as any);
        });
        const openapi = fromHono(app, { passthroughErrors: true });
        if (marked) {
          openapi.post("/orgs/:org/users", chanfanaValidator(), CreateUserEndpoint);
        } else {
          openapi.post("/orgs/:org/users", CreateUserEndpoint);
        }
        return app;
      };

      const plain = await postUser(build(false), "/orgs/1/users", validBody);
      const marked = await postUser(build(true), "/orgs/1/users", validBody);
      expect(marked.status).toBe(plain.status);
      expect(await marked.json()).toEqual(await plain.json());
      expect(errors.marked).toBeInstanceOf(ApiException);
      expect(errors.marked?.constructor).toBe(errors.plain?.constructor);
    });

    it("applies the endpoint's handleError()", async () => {
      const build = (marked: boolean) => {
        const app = new Hono();
        app.onError((err, c) => c.json({ message: err.message }, 500));
        const openapi = fromHono(app);
        if (marked) {
          openapi.post("/x", chanfanaValidator(), CustomErrorEndpoint);
        } else {
          openapi.post("/x", CustomErrorEndpoint);
        }
        return app;
      };

      const plain = await postUser(build(false), "/x", {});
      const marked = await postUser(build(true), "/x", {});
      expect(plain.status).toBe(500);
      expect(marked.status).toBe(500);
      expect(await marked.json()).toEqual({ message: "wrapped by handleError" });
    });
  });

  describe("raiseUnknownParameters", () => {
    // Adds a top-level key that is not a declared request section, which only raiseUnknownParameters rejects
    class ExtraSectionEndpoint extends SearchEndpoint {
      override async getUnvalidatedData() {
        return { ...(await super.getUnvalidatedData()), extra: true };
      }
    }

    it("rejects unknown sections by default", async () => {
      const app = new Hono();
      fromHono(app).get("/search", chanfanaValidator(), ExtraSectionEndpoint);

      const res = await app.request("/search?q=x");
      expect(res.status).toBe(400);
      const resp = (await res.json()) as any;
      expect(resp.errors[0].code).toBe(7001);
    });

    it("accepts unknown sections when raiseUnknownParameters is false", async () => {
      const seen: Record<string, unknown> = {};
      const app = new Hono();
      fromHono(app, { raiseUnknownParameters: false }).get(
        "/search",
        chanfanaValidator(),
        captureValid(seen),
        ExtraSectionEndpoint,
      );

      const res = await app.request("/search?q=x");
      expect(res.status).toBe(200);
      expect(seen.query).toEqual({ q: "x", limit: 10 });
    });
  });

  it("supports getSchema() overrides", async () => {
    const seen: Record<string, unknown> = {};
    const app = new Hono();
    fromHono(app).post("/s", chanfanaValidator(), captureValid(seen), GetterSchemaEndpoint);

    const res = await postUser(app, "/s", {});
    expect(res.status).toBe(200);
    expect(seen.json).toEqual({ title: "untitled" });
    expect(await res.json()).toEqual({ body: { title: "untitled" } });
  });

  it("keeps c.req.json() working before and after the marker", async () => {
    const bodies: unknown[] = [];
    const readBody: MiddlewareHandler = async (c, next) => {
      bodies.push(await c.req.json());
      await next();
    };
    const app = new Hono();
    fromHono(app).post("/orgs/:org/users", readBody, chanfanaValidator(), readBody, CreateUserEndpoint);

    const res = await postUser(app, "/orgs/1/users", { name: "Ana", age: 30 });
    expect(res.status).toBe(200);
    expect(bodies).toEqual([
      { name: "Ana", age: 30 },
      { name: "Ana", age: 30 },
    ]);
  });

  it("lets the endpoint read the raw body after the marker", async () => {
    const app = new Hono();
    fromHono(app).post("/lazy", chanfanaValidator(), LazyEndpoint);

    const res = await postUser(app, "/lazy", { name: "Ana" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: JSON.stringify({ name: "Ana" }) });
  });

  it("returns 400 on invalid JSON like routes without the marker", async () => {
    const app = new Hono();
    fromHono(app).post("/lazy", chanfanaValidator(), LazyEndpoint);

    const res = await postUser(app, "/lazy", "{not json");
    expect(res.status).toBe(400);
  });

  it("keeps concurrent requests isolated", async () => {
    const seen = new Map<number, string>();
    const app = new Hono();
    fromHono(app).post(
      "/orgs/:org/users",
      chanfanaValidator(),
      async (c, next) => {
        // Interleave the requests between validation and the endpoint
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        const { org } = c.req.valid("param" as never) as { org: number };
        seen.set(org, (c.req.valid("json" as never) as { name: string }).name);
        await next();
      },
      CreateUserEndpoint,
    );

    const responses = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => postUser(app, `/orgs/${i}/users`, { name: `user-${i}`, age: i })),
    );

    for (const [i, res] of responses.entries()) {
      expect(res.status).toBe(200);
      expect(seen.get(i)).toBe(`user-${i}`);
      const resp = (await res.json()) as any;
      expect(resp.data.body.name).toBe(`user-${i}`);
      expect(resp.data.params.org).toBe(i);
    }
  });

  it("doesn't store json for GET routes", async () => {
    const seen: Record<string, unknown> = {};
    const app = new Hono();
    fromHono(app).get("/search", chanfanaValidator(), captureValid(seen), SearchEndpoint);

    const res = await app.request("/search?q=hono");
    expect(res.status).toBe(200);
    expect(seen).toEqual({ json: undefined, query: { q: "hono", limit: 10 }, param: undefined, header: undefined });
    expect(await res.json()).toEqual({ query: { q: "hono", limit: 10 } });

    const head = await app.request("/search?q=hono", { method: "HEAD" });
    expect(head.status).toBe(200);
  });

  it("works with on()", async () => {
    const seen: Record<string, unknown> = {};
    const app = new Hono();
    fromHono(app).on("GET", "/search", chanfanaValidator(), captureValid(seen), SearchEndpoint);

    const res = await app.request("/search?q=on");
    expect(res.status).toBe(200);
    expect(seen.query).toEqual({ q: "on", limit: 10 });
  });

  it("works with all()", async () => {
    const seen: Record<string, unknown> = {};
    const app = new Hono();
    fromHono(app).all("/search", chanfanaValidator(), captureValid(seen), SearchEndpoint);

    const res = await app.request("/search?q=all");
    expect(res.status).toBe(200);
    expect(seen.query).toEqual({ q: "all", limit: 10 });
  });

  it("works with all() and middleware without the marker", async () => {
    let called = false;
    const app = new Hono();
    fromHono(app).all(
      "/search",
      async (_c, next) => {
        called = true;
        await next();
      },
      SearchEndpoint,
    );

    const res = await app.request("/search?q=all");
    expect(res.status).toBe(200);
    expect(called).toBe(true);
    expect(await res.json()).toEqual({ query: { q: "all", limit: 10 } });
  });

  it("works with nested routers and basePath", async () => {
    const seen: Record<string, unknown> = {};
    const child = fromHono(new Hono());
    child.post("/:org/users", chanfanaValidator(), captureValid(seen), CreateUserEndpoint);

    const app = new Hono().basePath("/api");
    const openapi = fromHono(app);
    openapi.route("/orgs", child);

    const res = await postUser(app, "/api/orgs/7/users", { name: "Ana", age: 30 });
    expect(res.status).toBe(200);
    expect(seen.param).toEqual({ org: 7 });
    expect(validateRequestCalls).toBe(1);
    expect(openapi.schema.paths["/api/orgs/{org}/users"].post).toBeDefined();
  });

  it("documents the route like routes without the marker", () => {
    const plain = fromHono(new Hono());
    plain.post("/orgs/:org/users", CreateUserEndpoint);
    const marked = fromHono(new Hono());
    marked.post(
      "/orgs/:org/users",
      async (_c: Context, next: Next) => next(),
      chanfanaValidator(),
      async (_c: Context, next: Next) => next(),
      CreateUserEndpoint,
    );

    expect(marked.schema).toEqual(plain.schema);
  });

  it("doesn't change routes without the marker", async () => {
    const seen: Record<string, unknown> = {};
    const app = new Hono();
    fromHono(app).post("/orgs/:org/users", captureValid(seen), CreateUserEndpoint);
    fromHono(app).post("/lazy", LazyEndpoint);

    const res = await postUser(app, "/orgs/1/users", { name: "Ana", age: 30 });
    expect(res.status).toBe(200);
    expect(seen).toEqual({ json: undefined, query: undefined, param: undefined, header: undefined });
    expect(validateRequestCalls).toBe(1);

    // Lazy validation: an endpoint that never validates doesn't fail on an invalid body
    const lazy = await postUser(app, "/lazy", "{not json");
    expect(lazy.status).toBe(200);
  });

  describe("UpdateEndpoint", () => {
    const UserSchema = z.object({
      id: z.number().optional(),
      name: z.string(),
      email: z.string(),
      status: z.string().optional().default("active"),
    });

    class ValidatorUserUpdate extends D1UpdateEndpoint {
      _meta = {
        model: {
          tableName: "validator_users",
          schema: UserSchema,
          primaryKeys: ["id"],
        },
      };
      dbName = "DB";
    }

    beforeEach(async () => {
      await env.DB.prepare("DROP TABLE IF EXISTS validator_users").run();
      await env.DB.prepare(
        "CREATE TABLE validator_users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, status TEXT DEFAULT 'active')",
      ).run();
      await env.DB.prepare(
        "INSERT INTO validator_users (name, email, status) VALUES ('Alice', 'alice@example.com', 'inactive')",
      ).run();
    });

    it("updates only the fields that were sent", async () => {
      const seen: Record<string, unknown> = {};
      const app = new Hono();
      fromHono(app).put("/users/:id", chanfanaValidator(), captureValid(seen), ValidatorUserUpdate);

      const res = await app.request(
        "/users/1",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Alice Updated", email: "alice@example.com" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      expect(seen.param).toEqual({ id: 1 });
      expect(seen.json).toEqual({ name: "Alice Updated", email: "alice@example.com", status: "active" });
      const resp = (await res.json()) as any;
      expect(resp.result).toEqual({ id: 1, name: "Alice Updated", email: "alice@example.com", status: "inactive" });
    });
  });

  describe("registration errors", () => {
    it("throws when the marker is used twice", () => {
      expect(() =>
        fromHono(new Hono()).post("/x", chanfanaValidator(), chanfanaValidator(), CreateUserEndpoint),
      ).toThrow("chanfanaValidator() can only be used once per route (POST /x)");
    });

    it("throws when the marker is placed after the endpoint", () => {
      expect(() => fromHono(new Hono()).post("/x", CreateUserEndpoint as any, chanfanaValidator())).toThrow(
        "chanfanaValidator() must be placed before an OpenAPIRoute endpoint class (POST /x)",
      );
    });

    it("throws when the route has no endpoint class", () => {
      expect(() => fromHono(new Hono()).get("/x", chanfanaValidator(), (c: Context) => c.text("hi"))).toThrow(
        "chanfanaValidator() must be placed before an OpenAPIRoute endpoint class (GET /x)",
      );
    });

    it("throws when the marker is passed to use()", () => {
      const openapi = fromHono(new Hono());
      expect(() => openapi.use(chanfanaValidator())).toThrow("chanfanaValidator() is not supported in use()");
      expect(() => openapi.use("/x", chanfanaValidator())).toThrow("chanfanaValidator() is not supported in use()");
    });

    it("throws with itty-router", () => {
      const router = fromIttyRouter(AutoRouter());
      expect(() => (router as any).post("/x", chanfanaValidator(), CreateUserEndpoint)).toThrow(
        "chanfanaValidator() is only supported with fromHono()",
      );
    });

    it("fails at request time on a plain Hono app", async () => {
      const app = new Hono();
      let message = "";
      app.onError((err, c) => {
        message = err.message;
        return c.text("error", 500);
      });
      app.post("/x", chanfanaValidator(), (c) => c.text("hi"));

      const res = await app.request("/x", { method: "POST" });
      expect(res.status).toBe(500);
      expect(message).toContain("chanfanaValidator() was called outside of a chanfana route");
    });
  });
});
