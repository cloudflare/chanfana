import { type Context, Hono } from "hono";
import { AutoRouter } from "itty-router";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  contentJson,
  CreateEndpoint,
  ForbiddenException,
  fromHono,
  fromIttyRouter,
  InputValidationException,
  OpenAPIRoute,
  UnauthorizedException,
  type ValidatedData,
} from "../../src";

type Calls = { hook: unknown[]; handle: unknown[] };

const bodySchema = z.object({
  email: z.email(),
  role: z.enum(["user", "admin"]).default("user"),
});

function createUserEndpoint(calls: Calls) {
  return class CreateUserEndpoint extends OpenAPIRoute {
    override schema = {
      request: {
        query: z.object({ dryRun: z.boolean().default(false) }),
        body: contentJson(bodySchema),
      },
    };

    override async onValidated(data: ValidatedData<typeof this.schema>) {
      expectTypeOf(data.body.email).toEqualTypeOf<string>();
      expectTypeOf(data.query.dryRun).toEqualTypeOf<boolean>();
      calls.hook.push(data);
      if (data.body.email.endsWith("@blocked.com")) {
        throw new ForbiddenException("Email domain not allowed");
      }
    }

    override async handle() {
      const data = await this.getValidatedData<typeof this.schema>();
      calls.handle.push(data);
      return { email: data.body.email, role: data.body.role, dryRun: data.query.dryRun };
    }
  };
}

// Reusable base class: the hook runs for every endpoint extending it
abstract class AdminRoute extends OpenAPIRoute<[Context]> {
  override async onValidated(_data: unknown, c: Context) {
    if (c.req.header("x-role") !== "admin") {
      throw new UnauthorizedException();
    }
    c.set("user" as never, "admin-user" as never);
  }
}

class AdminEchoEndpoint extends AdminRoute {
  override schema = {
    request: {
      params: z.object({ id: z.number() }),
    },
  };

  override async handle(c: Context) {
    const data = await this.getValidatedData<typeof this.schema>();
    return { id: data.params.id, user: c.get("user" as never) };
  }
}

// Without the hook, validation stays lazy: handle() may skip getValidatedData()
class LazyEndpoint extends OpenAPIRoute {
  override schema = {
    request: {
      body: contentJson(z.object({ name: z.string() })),
    },
  };

  override async handle() {
    return { skippedValidation: true };
  }
}

function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const routers = [
  { name: "Hono", create: () => fromHono(new Hono()) },
  { name: "itty-router", create: () => fromIttyRouter(AutoRouter()) },
];

describe.each(routers)("onValidated hook ($name)", ({ create }) => {
  it("receives the validated data before handle()", async () => {
    const calls: Calls = { hook: [], handle: [] };
    const router = create();
    router.post("/users", createUserEndpoint(calls));

    const response = await router.fetch(postJson("/users?dryRun=true", { email: "a@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "a@example.com", role: "user", dryRun: true });
    expect(calls.hook).toEqual([{ query: { dryRun: true }, body: { email: "a@example.com", role: "user" } }]);
    // handle() gets the same cached object, validation runs once
    expect(calls.handle[0]).toBe(calls.hook[0]);
  });

  it("short-circuits with the error response when the hook throws an ApiException", async () => {
    const calls: Calls = { hook: [], handle: [] };
    const router = create();
    router.post("/users", createUserEndpoint(calls));

    const response = await router.fetch(postJson("/users", { email: "a@blocked.com" }));
    const resp = await response.json();

    expect(response.status).toBe(403);
    expect(resp).toEqual({
      success: false,
      errors: [{ code: 7004, message: "Email domain not allowed" }],
      result: null,
    });
    expect(calls.hook).toHaveLength(1);
    expect(calls.handle).toHaveLength(0);
  });

  it("is not called when request validation fails", async () => {
    const calls: Calls = { hook: [], handle: [] };
    const router = create();
    router.post("/users", createUserEndpoint(calls));

    const response = await router.fetch(postJson("/users", { email: "not-an-email" }));
    const resp = await response.json();

    expect(response.status).toBe(400);
    expect(resp.success).toBe(false);
    expect(resp.errors[0].code).toBe(7001);
    expect(resp.errors[0].path).toEqual(["body", "email"]);
    expect(calls.hook).toHaveLength(0);
    expect(calls.handle).toHaveLength(0);
  });

  it("keeps validation lazy for routes that do not override the hook", async () => {
    const router = create();
    router.post("/lazy", LazyEndpoint);

    const response = await router.fetch(postJson("/lazy", { name: 123 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ skippedValidation: true });
  });
});

describe("onValidated hook (raiseOnError)", () => {
  it("propagates hook errors to the router error handler", async () => {
    const calls: Calls = { hook: [], handle: [] };
    const app = new Hono();
    let caught: unknown;
    app.onError((err, c) => {
      caught = err;
      return c.json({ handledBy: "onError" }, 418);
    });
    const openapi = fromHono(app, { raiseOnError: true });
    openapi.post("/users", createUserEndpoint(calls));

    const response = await app.fetch(postJson("/users", { email: "a@blocked.com" }));

    expect(response.status).toBe(418);
    expect((caught as { status?: number }).status).toBe(403);
    expect(calls.handle).toHaveLength(0);
  });
});

describe("onValidated hook (Hono context)", () => {
  it("receives the Hono context and can share values with handle()", async () => {
    const openapi = fromHono(new Hono());
    openapi.get("/admin/:id", AdminEchoEndpoint);

    const response = await openapi.fetch(new Request("http://localhost/admin/7", { headers: { "x-role": "admin" } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 7, user: "admin-user" });
  });

  it("rejects requests in a reusable base class hook", async () => {
    const openapi = fromHono(new Hono());
    openapi.get("/admin/:id", AdminEchoEndpoint);

    const response = await openapi.fetch(new Request("http://localhost/admin/7"));
    const resp = await response.json();

    expect(response.status).toBe(401);
    expect(resp.errors[0].code).toBe(7003);
  });

  it("runs after validation in a reusable base class hook", async () => {
    const openapi = fromHono(new Hono());
    openapi.get("/admin/:id", AdminEchoEndpoint);

    const response = await openapi.fetch(new Request("http://localhost/admin/abc"));
    const resp = await response.json();

    expect(response.status).toBe(400);
    expect(resp.errors[0].path).toEqual(["params", "id"]);
  });
});

describe("onValidated hook (auto endpoints)", () => {
  const UserModel = z.object({ id: z.number(), email: z.email() });

  class CreateUser extends CreateEndpoint {
    _meta = {
      model: { schema: UserModel, primaryKeys: ["id"] },
    };

    override async onValidated(data: { body: z.infer<typeof UserModel> }) {
      if (data.body.email.endsWith("@blocked.com")) {
        throw new InputValidationException("Email domain not allowed", ["body", "email"]);
      }
    }

    override async create(data: z.infer<typeof UserModel>) {
      return data;
    }
  }

  it("works alongside auto endpoints and can reject the request", async () => {
    const openapi = fromHono(new Hono());
    openapi.post("/users", CreateUser);

    const blocked = await openapi.fetch(postJson("/users", { id: 1, email: "a@blocked.com" }));
    const blockedResp = await blocked.json();
    expect(blocked.status).toBe(400);
    expect(blockedResp.errors[0]).toEqual({ code: 7001, message: "Email domain not allowed", path: ["body", "email"] });

    const ok = await openapi.fetch(postJson("/users", { id: 2, email: "a@example.com" }));
    expect(ok.status).toBe(201);
    expect((await ok.json()).result).toEqual({ id: 2, email: "a@example.com" });
  });
});
