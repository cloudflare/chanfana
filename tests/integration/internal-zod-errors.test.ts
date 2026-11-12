import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromHono, fromIttyRouter, InputValidationException, MultiException, OpenAPIRoute } from "../../src";
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
