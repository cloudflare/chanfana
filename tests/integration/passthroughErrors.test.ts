import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiException, fromHono, MultiException, NotFoundException, OpenAPIRoute } from "../../src";

class EndpointThatThrowsNotFound extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle() {
    throw new NotFoundException("Item not found");
  }
}

class EndpointWithValidation extends OpenAPIRoute {
  schema = {
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle() {
    await this.getValidatedData();
    return { success: true };
  }
}

class EndpointThatThrowsPlainError extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
    },
  };

  async handle() {
    throw new Error("Unexpected failure");
  }
}

describe("passthroughErrors", () => {
  it("ApiException propagates as-is to onError (not HTTPException)", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      return c.json({ error: "caught" }, 500);
    });

    const router = fromHono(app, { passthroughErrors: true });
    router.get("/items/:id", EndpointThatThrowsNotFound);

    const request = await router.fetch(new Request("http://localhost/items/123"));
    const resp = await request.json();

    // Error should be the raw NotFoundException, NOT an HTTPException
    expect(caughtError).toBeInstanceOf(NotFoundException);
    expect(caughtError).toBeInstanceOf(ApiException);
    expect(caughtError).not.toBeInstanceOf(HTTPException);
    expect((caughtError as NotFoundException).message).toEqual("Item not found");
    expect((caughtError as NotFoundException).status).toEqual(404);
    expect((caughtError as NotFoundException).code).toEqual(7002);

    // Response comes from the onError handler, not from chanfana
    expect(request.status).toEqual(500);
    expect((resp as any).error).toEqual("caught");
  });

  it("validation error propagates as raw MultiException to onError (not HTTPException)", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      return c.json({ error: "validation caught" }, 422);
    });

    const router = fromHono(app, { passthroughErrors: true });
    router.post("/items", EndpointWithValidation);

    const request = await router.fetch(
      new Request("http://localhost/items", {
        method: "POST",
        body: JSON.stringify({ name: 123 }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const resp = await request.json();

    // Error should be a raw MultiException (chanfana's validation wrapper), not HTTPException
    expect(caughtError).toBeInstanceOf(MultiException);
    expect(caughtError).toBeInstanceOf(ApiException);
    expect(caughtError).not.toBeInstanceOf(HTTPException);

    // Response comes from the onError handler, not from chanfana
    expect(request.status).toEqual(422);
    expect((resp as any).error).toEqual("validation caught");
  });

  it("plain errors propagate as-is to onError", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      return c.json({ error: "caught" }, 500);
    });

    const router = fromHono(app, { passthroughErrors: true });
    router.get("/crash", EndpointThatThrowsPlainError);

    const request = await router.fetch(new Request("http://localhost/crash"));
    const resp = await request.json();

    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError).not.toBeInstanceOf(HTTPException);
    expect((caughtError as Error).message).toEqual("Unexpected failure");

    expect(request.status).toEqual(500);
    expect((resp as any).error).toEqual("caught");
  });

  it("without the flag, errors still arrive as HTTPException (regression)", async () => {
    const app = new Hono();
    let caughtError: unknown = null;

    app.onError((err, c) => {
      caughtError = err;
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      return c.json({ error: "Internal Server Error" }, 500);
    });

    const router = fromHono(app);
    router.get("/items/:id", EndpointThatThrowsNotFound);

    const request = await router.fetch(new Request("http://localhost/items/123"));
    const resp = await request.json();

    // Default behavior: error wrapped as HTTPException
    expect(caughtError).toBeInstanceOf(HTTPException);
    expect((caughtError as HTTPException).status).toEqual(404);

    // Response has chanfana's standard error format
    expect(request.status).toEqual(404);
    expect((resp as any).success).toEqual(false);
    expect((resp as any).errors[0].code).toEqual(7002);
    expect((resp as any).errors[0].message).toEqual("Item not found");
  });
});
