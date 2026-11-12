import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  formatChanfanaError,
  fromHono,
  fromIttyRouter,
  InputValidationException,
  MultiException,
  OpenAPIRoute,
} from "../../src";
import { contentJson } from "../../src/contentTypes";

const SECRET_FIELD = "internalSecretColumn";

class InternalZodErrorEndpoint extends OpenAPIRoute {
  async handle() {
    z.object({ [SECRET_FIELD]: z.number() }).parse({ [SECRET_FIELD]: "not-a-number" });
    return { ok: true };
  }
}

class RequestValidationEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: contentJson(z.object({ name: z.string() })),
    },
  };

  async handle() {
    await this.getValidatedData<typeof this.schema>();
    return { ok: true };
  }
}

class ReclassifiedZodErrorEndpoint extends OpenAPIRoute {
  protected override handleError(error: unknown): unknown {
    if (error instanceof z.ZodError) {
      return new MultiException(
        error.issues.map((issue) => new InputValidationException(issue.message, issue.path.map(String))),
      );
    }
    return error;
  }

  async handle() {
    z.object({ name: z.string() }).parse({ name: 1 });
    return { ok: true };
  }
}

const invalidBody = () =>
  new Request("https://example.com/validation", {
    method: "POST",
    body: JSON.stringify({ name: 123 }),
    headers: { "content-type": "application/json" },
  });

describe("ZodErrors thrown from handle() (itty-router)", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/internal", InternalZodErrorEndpoint);
  router.post("/validation", RequestValidationEndpoint);
  router.get("/reclassified", ReclassifiedZodErrorEndpoint);

  it("are not converted into a 400 validation response", async () => {
    const resp = await router.fetch(new Request("https://example.com/internal"), {}, {});
    const text = await resp.text();

    // The error is handled by itty-router's own `catch` like any other unknown error
    expect(resp.status).toBe(500);
    expect(text).not.toContain("7001");
  });

  it("are re-thrown as unknown errors from execute()", async () => {
    const route = new InternalZodErrorEndpoint({ router: undefined, route: "/internal", urlParams: [] });
    await expect(route.execute(new Request("https://example.com/internal"), {}, {})).rejects.toBeInstanceOf(z.ZodError);
  });

  it("can still be reported as validation errors through handleError()", async () => {
    const resp = await router.fetch(new Request("https://example.com/reclassified"), {}, {});
    const body: any = await resp.json();

    expect(resp.status).toBe(400);
    expect(body.errors[0].code).toBe(7001);
    expect(body.errors[0].path).toEqual(["name"]);
  });

  it("does not change request validation errors", async () => {
    const resp = await router.fetch(invalidBody(), {}, {});
    const body: any = await resp.json();

    expect(resp.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.result).toBeNull();
    expect(body.errors).toEqual([{ code: 7001, message: expect.any(String), path: ["body", "name"] }]);
  });
});

describe("ZodErrors thrown from handle() (Hono)", () => {
  function buildApp(options?: { raiseOnError?: boolean }) {
    const app = new Hono();
    const errors: unknown[] = [];
    app.onError((err, c) => {
      errors.push(err);
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      return c.json({ success: false, errors: [{ code: 7000, message: "Internal Server Error" }] }, 500);
    });
    const openapi = fromHono(app, options);
    openapi.get("/internal", InternalZodErrorEndpoint);
    openapi.post("/validation", RequestValidationEndpoint);
    return { app, errors };
  }

  it("are not converted into a 400 validation response", async () => {
    const { app, errors } = buildApp();
    const resp = await app.request("/internal");
    const text = await resp.text();

    expect(resp.status).toBe(500);
    expect(text).not.toContain("7001");
    expect(text).not.toContain(SECRET_FIELD);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(z.ZodError);
    expect(errors[0]).not.toBeInstanceOf(HTTPException);
  });

  it("return 500 with Hono's default error handler", async () => {
    const app = new Hono();
    fromHono(app).get("/internal", InternalZodErrorEndpoint);
    const resp = await app.request("/internal");

    expect(resp.status).toBe(500);
    expect(await resp.text()).not.toContain(SECRET_FIELD);
  });

  it("reach onError as raw ZodErrors with raiseOnError", async () => {
    const { app, errors } = buildApp({ raiseOnError: true });
    const resp = await app.request("/internal");

    expect(resp.status).toBe(500);
    expect(errors[0]).toBeInstanceOf(z.ZodError);
  });

  it("does not change request validation errors", async () => {
    const { app, errors } = buildApp();
    const resp = await app.fetch(invalidBody());
    const body: any = await resp.json();

    expect(resp.status).toBe(400);
    expect(body.errors).toEqual([{ code: 7001, message: expect.any(String), path: ["body", "name"] }]);
    expect(errors[0]).toBeInstanceOf(HTTPException);
  });
});

describe("formatChanfanaError with ZodErrors", () => {
  it("returns null for a raw ZodError", () => {
    const error = new z.ZodError([{ code: "custom", message: "bad", path: [SECRET_FIELD], input: undefined }]);
    expect(formatChanfanaError(error)).toBeNull();
  });

  it("still formats request-validation MultiExceptions", async () => {
    const resp = formatChanfanaError(new MultiException([new InputValidationException("bad", ["body", "name"])]));
    expect(resp?.status).toBe(400);
    const body: any = await resp?.json();
    expect(body.errors).toEqual([{ code: 7001, message: "bad", path: ["body", "name"] }]);
  });
});

describe("ZodErrors thrown from handle() with a custom itty-router catch", () => {
  it("receives the original ZodError", async () => {
    const caught: unknown[] = [];
    const router = fromIttyRouter(
      AutoRouter({
        catch: (error: unknown) => {
          caught.push(error);
          return Response.json(
            { success: false, errors: [{ code: 7000, message: "Internal Server Error" }] },
            { status: 500 },
          );
        },
      }),
    );
    router.get("/internal", InternalZodErrorEndpoint);

    const resp = await router.fetch(new Request("https://example.com/internal"), {}, {});
    const text = await resp.text();

    expect(resp.status).toBe(500);
    expect(text).not.toContain(SECRET_FIELD);
    expect(caught).toHaveLength(1);
    expect(caught[0]).toBeInstanceOf(z.ZodError);
    expect((caught[0] as z.ZodError).issues[0]?.path).toEqual([SECRET_FIELD]);
  });
});

describe("ZodErrors thrown from handle() with passthroughErrors", () => {
  it("stay raw on itty-router", async () => {
    const caught: unknown[] = [];
    const router = fromIttyRouter(
      AutoRouter({
        catch: (error: unknown) => {
          caught.push(error);
          return new Response("error", { status: 500 });
        },
      }),
      { passthroughErrors: true },
    );
    router.get("/internal", InternalZodErrorEndpoint);

    const resp = await router.fetch(new Request("https://example.com/internal"), {}, {});

    expect(resp.status).toBe(500);
    expect(caught[0]).toBeInstanceOf(z.ZodError);
  });

  it("stay raw on Hono", async () => {
    const app = new Hono();
    const errors: unknown[] = [];
    app.onError((err, c) => {
      errors.push(err);
      return c.text("error", 500);
    });
    fromHono(app, { passthroughErrors: true }).get("/internal", InternalZodErrorEndpoint);

    const resp = await app.request("/internal");

    expect(resp.status).toBe(500);
    expect(errors[0]).toBeInstanceOf(z.ZodError);
    expect(errors[0]).not.toBeInstanceOf(HTTPException);
  });
});
