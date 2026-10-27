import { Hono } from "hono";
import { AutoRouter } from "itty-router";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromHono, fromIttyRouter, OpenAPIRoute } from "../../src";
import { buildRequest } from "../utils";

class YamlRoundTripEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Yaml"],
    summary: "Endpoint with values that are tricky to serialize as YAML",
    description: "Multi-line\ndescription: with a colon, 'quotes' and \"double quotes\"",
    request: {
      query: z.object({
        flag: z.boolean().optional().describe("yes"),
        version: z.string().default("1.0"),
        empty: z.string().default(""),
        whitespace: z.string().default("   "),
        nullish: z.string().nullable().optional(),
        octalLike: z.string().default("0123"),
      }),
    },
    responses: {
      "200": {
        description: "on",
        content: {
          "application/json": {
            schema: z.object({
              count: z.number().int().min(0),
              tags: z.array(z.enum(["null", "true", "~", "no"])),
            }),
          },
        },
      },
    },
  };

  async handle() {
    return { count: 0, tags: [] };
  }
}

class StringFormatsEndpoint extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "String formats",
        content: {
          "application/json": {
            schema: z.object({
              guid: z.guid(),
              cidrv4: z.cidrv4(),
              cidrv6: z.cidrv6(),
              base64url: z.base64url(),
              time: z.iso.time(),
              duration: z.iso.duration(),
            }),
          },
        },
      },
    },
  };

  async handle() {
    return {};
  }
}

const catSchema = z.object({ kind: z.literal("cat"), meows: z.boolean() }).openapi("Cat");
const dogSchema = z.object({ kind: z.literal("dog"), barks: z.boolean() }).openapi("Dog");
const petSchema = z.discriminatedUnion("kind", [catSchema, dogSchema]);
const carSchema = z.object({ kind: z.literal("car"), wheels: z.number() }).openapi("Car");

class NestedDiscriminatedUnionEndpoint extends OpenAPIRoute {
  schema = {
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.discriminatedUnion("kind", [petSchema, carSchema]),
          },
        },
      },
    },
    responses: {
      "200": { description: "ok" },
    },
  };

  async handle() {
    const data = await this.getValidatedData<typeof this.schema>();
    return { kind: data.body.kind };
  }
}

describe("openapi.yaml output", () => {
  it("hono: yaml document parses to the same schema as openapi.json", async () => {
    const router = fromHono(new Hono());
    router.get("/yaml", YamlRoundTripEndpoint);

    const jsonResp = await router.fetch(new Request("http://localhost/openapi.json"));
    const yamlResp = await router.fetch(new Request("http://localhost/openapi.yaml"));

    expect(yamlResp.status).toBe(200);
    expect(yamlResp.headers.get("content-type")).toContain("text/yaml");
    expect(load(await yamlResp.text())).toEqual(await jsonResp.json());
  });

  it("itty-router: yaml document parses to the same schema as openapi.json", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/yaml", YamlRoundTripEndpoint);

    const jsonResp = await router.fetch(buildRequest({ method: "GET", path: "/openapi.json" }));
    const yamlResp = await router.fetch(buildRequest({ method: "GET", path: "/openapi.yaml" }));

    expect(yamlResp.status).toBe(200);
    expect(yamlResp.headers.get("content-type")).toContain("text/yaml");
    expect(load(await yamlResp.text())).toEqual(await jsonResp.json());
  });
});

describe("openapi schema generation", () => {
  it("documents zod v4 string formats", async () => {
    const router = fromHono(new Hono());
    router.get("/formats", StringFormatsEndpoint);

    const resp: any = await (await router.fetch(new Request("http://localhost/openapi.json"))).json();
    const props = resp.paths["/formats"].get.responses["200"].content["application/json"].schema.properties;

    expect(props).toEqual({
      guid: { type: "string", format: "uuid" },
      cidrv4: { type: "string", format: "ipv4-cidr" },
      cidrv6: { type: "string", format: "ipv6-cidr" },
      base64url: { type: "string", format: "base64url" },
      time: { type: "string", format: "time" },
      duration: { type: "string", format: "duration" },
    });
  });

  it("documents nested discriminated unions with a discriminator mapping", async () => {
    const router = fromHono(new Hono());
    router.post("/things", NestedDiscriminatedUnionEndpoint);

    const resp: any = await (await router.fetch(new Request("http://localhost/openapi.json"))).json();
    const schema = resp.paths["/things"].post.requestBody.content["application/json"].schema;

    expect(schema.oneOf).toHaveLength(2);
    expect(schema.oneOf[0].discriminator).toEqual({
      propertyName: "kind",
      mapping: {
        cat: "#/components/schemas/Cat",
        dog: "#/components/schemas/Dog",
      },
    });
    expect(schema.oneOf[1]).toEqual({ $ref: "#/components/schemas/Car" });
    expect(Object.keys(resp.components.schemas)).toEqual(expect.arrayContaining(["Cat", "Dog", "Car"]));
  });

  it("validates request bodies against nested discriminated unions", async () => {
    const router = fromHono(new Hono());
    router.post("/things", NestedDiscriminatedUnionEndpoint);

    const post = (body: unknown) =>
      router.fetch(
        new Request("http://localhost/things", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }),
      );

    const dog = await post({ kind: "dog", barks: true });
    expect(dog.status).toBe(200);
    expect(await dog.json()).toEqual({ kind: "dog" });

    const car = await post({ kind: "car", wheels: 4 });
    expect(car.status).toBe(200);
    expect(await car.json()).toEqual({ kind: "car" });

    const unknownKind = await post({ kind: "boat" });
    expect(unknownKind.status).toBe(400);

    const missingField = await post({ kind: "cat" });
    expect(missingField.status).toBe(400);
  });
});
