import { AutoRouter } from "itty-router";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { Arr, fromIttyRouter, Obj, OpenAPIRoute, type ParameterType, Str } from "../../src";
import { buildRequest } from "../utils";

class DeprecatedLegacyQueryEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      query: Obj({
        q: Str({ deprecated: true }),
      }),
    },
    responses: {
      "200": {
        description: "ok",
      },
    },
  };

  async handle() {
    return {};
  }
}

describe("legacy parameter helpers", () => {
  it("preserve Obj and Arr type inference", () => {
    const metadata: ParameterType = { description: "items" };
    const schema = Obj({ items: Arr(Str()) });

    expect(schema.parse({ items: ["alpha"] })).toEqual({ items: ["alpha"] });
    expect(Arr(Str(), metadata).parse(["beta"])).toEqual(["beta"]);
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<{ items: string[] }>();
  });

  it("preserves optional and default wrapper types", () => {
    const optional = Str({ required: false });
    const defaulted = Str({ default: "anonymous" });
    const schema = Obj({ defaulted, optional });

    expect(optional).toBeInstanceOf(z.ZodOptional);
    expect(defaulted).toBeInstanceOf(z.ZodDefault);
    expect(schema.parse({})).toEqual({ defaulted: "anonymous" });
    expectTypeOf(optional).toEqualTypeOf<z.ZodOptional<z.ZodString>>();
    expectTypeOf(defaulted).toEqualTypeOf<z.ZodDefault<z.ZodString>>();
    expectTypeOf<z.infer<typeof schema>>().toEqualTypeOf<{
      defaulted: string;
      optional?: string | undefined;
    }>();

    // @ts-expect-error defaulted schemas are wrappers, not ZodString instances.
    type _DefaultedMin = typeof defaulted.min;
  });

  it("passes deprecated metadata through to OpenAPI", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/deprecated-query", DeprecatedLegacyQueryEndpoint);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/openapi.json" }));
    const resp = await request.json();
    const parameter = resp.paths["/deprecated-query"].get.parameters[0];

    expect(parameter.schema.deprecated).toBe(true);
  });
});
