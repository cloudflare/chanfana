import { Hono } from "hono";
import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiException,
  fromHono,
  fromIttyRouter,
  InputValidationException,
  MultiException,
  NotFoundException,
  OpenAPIRoute,
  ServiceUnavailableException,
  TooManyRequestsException,
  UnprocessableEntityException,
} from "../../src";

class DocumentedNotFoundException extends NotFoundException {
  override documentation_url = "https://developers.cloudflare.com/errors/not-found";
}

class ThrowDocumentedEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      ...DocumentedNotFoundException.schema(),
    },
  };

  async handle() {
    throw new DocumentedNotFoundException("missing");
  }
}

class ThrowOptionDocumentedEndpoint extends OpenAPIRoute {
  async handle() {
    throw new ApiException("boom", { documentation_url: "https://example.com/docs/boom" });
  }
}

class ThrowPlainEndpoint extends OpenAPIRoute {
  async handle() {
    throw new NotFoundException();
  }
}

class ThrowEscapedPathEndpoint extends OpenAPIRoute {
  async handle() {
    throw new InputValidationException("bad", ["body", "a/b", "c~d", 0]);
  }
}

class ThrowEmptyPathEndpoint extends OpenAPIRoute {
  async handle() {
    throw new InputValidationException("bad", []);
  }
}

class NestedBodyEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({ user: z.object({ name: z.string(), tags: z.array(z.string()) }) }),
          },
        },
      },
    },
  };

  async handle() {
    await this.getValidatedData<typeof this.schema>();
    return { ok: true };
  }
}

class ThrowZodEndpoint extends OpenAPIRoute {
  async handle() {
    z.object({ items: z.array(z.number()) }).parse({ items: [1, "x"] });
    return { ok: true };
  }
}

function buildRouter() {
  const router = fromIttyRouter(AutoRouter());
  router.get("/documented", ThrowDocumentedEndpoint);
  router.get("/option-documented", ThrowOptionDocumentedEndpoint);
  router.get("/plain", ThrowPlainEndpoint);
  router.get("/escaped", ThrowEscapedPathEndpoint);
  router.get("/empty-path", ThrowEmptyPathEndpoint);
  router.post("/nested", NestedBodyEndpoint);
  router.get("/zod", ThrowZodEndpoint);
  return router;
}

const get = (router: ReturnType<typeof buildRouter>, path: string) =>
  router.fetch(new Request(`https://example.com${path}`), {}, {});

describe("documentation_url", () => {
  it("is included when set on the exception class", async () => {
    const resp = await get(buildRouter(), "/documented");
    const body: any = await resp.json();
    expect(resp.status).toBe(404);
    expect(body.errors).toEqual([
      { code: 7002, message: "missing", documentation_url: "https://developers.cloudflare.com/errors/not-found" },
    ]);
  });

  it("is included when passed as a constructor option", async () => {
    const body: any = await (await get(buildRouter(), "/option-documented")).json();
    expect(body.errors[0].documentation_url).toBe("https://example.com/docs/boom");
  });

  it("is absent by default", async () => {
    const body: any = await (await get(buildRouter(), "/plain")).json();
    expect(body.errors).toEqual([{ code: 7002, message: "Not Found" }]);
  });

  it("is documented in the schema only when set", () => {
    const documented: any = DocumentedNotFoundException.schema()[404];
    const plain: any = NotFoundException.schema()[404];
    const documentedItem = documented.content["application/json"].schema.shape.errors.element;
    const plainItem = plain.content["application/json"].schema.shape.errors.element;
    expect(documentedItem.shape.documentation_url).toBeDefined();
    expect(plainItem.shape.documentation_url).toBeUndefined();
  });
});

describe("path", () => {
  it("is returned unchanged", async () => {
    const body: any = await (await get(buildRouter(), "/escaped")).json();
    expect(body.errors[0]).toEqual({ code: 7001, message: "bad", path: ["body", "a/b", "c~d", 0] });
  });

  it("is returned when empty", async () => {
    const body: any = await (await get(buildRouter(), "/empty-path")).json();
    expect(body.errors[0]).toEqual({ code: 7001, message: "bad", path: [] });
  });

  it("is set for ZodErrors thrown from handle()", async () => {
    const body: any = await (await get(buildRouter(), "/zod")).json();
    expect(body.errors[0]).toEqual({ code: 7001, message: expect.any(String), path: ["items", "1"] });
  });

  it("is documented in the schema without extra fields", () => {
    const schema: any = InputValidationException.schema()[400];
    const item = schema.content["application/json"].schema.shape.errors.element;
    expect(Object.keys(item.shape)).toEqual(["code", "message", "path"]);
  });
});

describe("content-type", () => {
  it("is exactly application/json for errors and success", async () => {
    const errorResp = await get(buildRouter(), "/plain");
    expect(errorResp.headers.get("content-type")).toBe("application/json");

    const okResp = await buildRouter().fetch(
      new Request("https://example.com/nested", {
        method: "POST",
        body: JSON.stringify({ user: { name: "a", tags: [] } }),
        headers: { "content-type": "application/json" },
      }),
      {},
      {},
    );
    expect(okResp.status).toBe(200);
    expect(okResp.headers.get("content-type")).toBe("application/json");
  });
});

describe("result on errors", () => {
  it("is always null", async () => {
    const router = buildRouter();
    for (const path of ["/plain", "/zod", "/escaped"]) {
      const body: any = await (await get(router, path)).json();
      expect(body.success).toBe(false);
      expect(body.result).toBeNull();
    }
  });

  it("is null with Hono and raiseOnError", async () => {
    const app = fromHono(new Hono(), { raiseOnError: true });
    app.get("/plain", ThrowPlainEndpoint);
    const resp = await app.request("/plain");
    expect(resp.status).toBe(404);
    const body: any = await resp.json();
    expect(body.result).toBeNull();
  });
});

class ThrowRetryEndpoint extends OpenAPIRoute {
  async handle() {
    throw new TooManyRequestsException("slow down", 30, { documentation_url: "https://example.com/rate" });
  }
}

class ThrowUnavailableEndpoint extends OpenAPIRoute {
  async handle() {
    throw new ServiceUnavailableException("down", 60, { documentation_url: "https://example.com/down" });
  }
}

class ThrowMultiEndpoint extends OpenAPIRoute {
  async handle() {
    throw new MultiException([
      new InputValidationException("bad name", ["body", "name"]),
      new NotFoundException("missing", { documentation_url: "https://example.com/nf" }),
    ]);
  }
}

describe("additional error format cases", () => {
  it("UnprocessableEntityException keeps path", () => {
    const [err] = new UnprocessableEntityException("bad", ["body", "items", "2"]).buildResponse();
    expect(err).toEqual({ code: 7007, message: "bad", path: ["body", "items", "2"] });
  });

  it("keeps documentation_url when isVisible is false", () => {
    const exc = new ApiException("secret", { documentation_url: "https://example.com/x" });
    exc.isVisible = false;
    expect(exc.buildResponse()).toEqual([
      { code: 7000, message: "Internal Error", documentation_url: "https://example.com/x" },
    ]);
  });

  it("prefers the constructor option over the class property", () => {
    const exc = new DocumentedNotFoundException("x", { documentation_url: "https://example.com/override" });
    expect(exc.buildResponse()[0]?.documentation_url).toBe("https://example.com/override");
  });

  it("sends Retry-After and documentation_url for TooManyRequests and ServiceUnavailable", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/rate", ThrowRetryEndpoint);
    router.get("/down", ThrowUnavailableEndpoint);

    const rate = await router.fetch(new Request("https://example.com/rate"), {}, {});
    expect(rate.status).toBe(429);
    expect(rate.headers.get("Retry-After")).toBe("30");
    expect(((await rate.json()) as any).errors[0].documentation_url).toBe("https://example.com/rate");

    const down = await router.fetch(new Request("https://example.com/down"), {}, {});
    expect(down.status).toBe(503);
    expect(down.headers.get("Retry-After")).toBe("60");
    expect(((await down.json()) as any).errors[0].documentation_url).toBe("https://example.com/down");
  });

  it("formats MultiException with mixed children", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/multi", ThrowMultiEndpoint);
    const resp = await router.fetch(new Request("https://example.com/multi"), {}, {});
    expect(resp.status).toBe(404);
    expect(((await resp.json()) as any).errors).toEqual([
      { code: 7001, message: "bad name", path: ["body", "name"] },
      { code: 7002, message: "missing", documentation_url: "https://example.com/nf" },
    ]);
  });

  it("returns result: null for Hono request validation errors", async () => {
    for (const options of [{}, { raiseOnError: true }]) {
      const app = fromHono(new Hono(), options);
      app.post("/nested", NestedBodyEndpoint);
      const resp = await app.request("/nested", {
        method: "POST",
        body: JSON.stringify({ user: { name: 1, tags: [] } }),
        headers: { "content-type": "application/json" },
      });
      expect(resp.status).toBe(400);
      const body: any = await resp.json();
      expect(body.errors[0].path).toEqual(["body", "user", "name"]);
      expect(body.result).toBeNull();
    }
  });
});
