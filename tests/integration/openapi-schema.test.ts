import { Hono } from "hono";
import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromHono, fromIttyRouter, OpenAPIRoute } from "../../src";
import { ToDoGet, todoRouter } from "../router";
import { buildRequest } from "../utils";

const userIdParamsSchema = z.object({
  id: z.string().describe("User ID"),
});

class GetUserByIdEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Users"],
    summary: "Get user by ID",
    request: {
      params: userIdParamsSchema,
    },
    responses: {
      "200": {
        description: "User found",
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(),
              name: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle() {
    return { id: "1", name: "John Doe" };
  }
}

class GetUserWithQueryEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Users"],
    summary: "Get user by ID with query",
    request: {
      params: z.object({
        id: z.string().describe("User ID"),
      }),
      query: z.object({
        include: z.string().optional().describe("Related resources to include"),
      }),
    },
    responses: {
      "200": {
        description: "User found",
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle() {
    return { id: "1" };
  }
}

describe("openapi schema", () => {
  it("custom content type", async () => {
    const request = await todoRouter.fetch(buildRequest({ method: "GET", path: "/openapi.json" }));
    const resp = await request.json();
    const respSchema = resp.paths["/contenttype"].get.responses[200];

    expect(respSchema.contentType).toBeUndefined();
    expect(respSchema.content).toEqual({
      "text/csv": {
        schema: {
          type: "string",
        },
      },
    });
  });

  it("with base defined", async () => {
    const router = fromIttyRouter(AutoRouter(), {
      base: "/api",
    });
    router.get("/todo", ToDoGet);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/api/openapi.json" }));
    const resp = await request.json();

    expect(Object.keys(resp.paths)[0]).toEqual("/api/todo");
  });

  it.each([
    { openapiVersion: "3.1" as const, openapi: "3.1.0" },
    { openapiVersion: "3" as const, openapi: "3.0.3" },
  ])("exports request.params as OpenAPI path parameters ($openapi)", async ({ openapiVersion, openapi }) => {
    const router = fromHono(new Hono(), { openapiVersion });
    router.get("/users/:id", GetUserByIdEndpoint);

    const first = await (await router.fetch(new Request("http://localhost/openapi.json"))).json();
    const second = await (await router.fetch(new Request("http://localhost/openapi.json"))).json();

    expect(first.openapi).toBe(openapi);
    expect(Object.keys(first.paths)).toContain("/users/{id}");

    const parameters = first.paths["/users/{id}"].get.parameters;
    expect(parameters).toHaveLength(1);
    expect(parameters[0]).toMatchObject({
      name: "id",
      in: "path",
      required: true,
      schema: {
        type: "string",
        description: "User ID",
      },
    });

    // Repeated generation stays deterministic and preserves schema metadata.
    expect(second.paths["/users/{id}"].get.parameters).toEqual(parameters);
    expect(userIdParamsSchema.shape.id.description).toBe("User ID");
  });

  it("keeps query parameters alongside path parameters without duplicates", async () => {
    const router = fromHono(new Hono());
    router.get("/users/:id", GetUserWithQueryEndpoint);

    const schema = await (await router.fetch(new Request("http://localhost/openapi.json"))).json();
    const parameters = schema.paths["/users/{id}"].get.parameters;

    expect(parameters).toHaveLength(2);
    expect(parameters.filter((parameter: { name: string }) => parameter.name === "id")).toHaveLength(1);
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "id",
          in: "path",
          required: true,
          schema: expect.objectContaining({ type: "string" }),
        }),
        expect.objectContaining({
          name: "include",
          in: "query",
          schema: expect.objectContaining({ type: "string" }),
        }),
      ]),
    );
  });

  it("exports request.params for itty-router through the shared registration layer", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/users/:id", GetUserByIdEndpoint);

    const schema = await (await router.fetch(buildRequest({ method: "GET", path: "/openapi.json" }))).json();
    const parameters = schema.paths["/users/{id}"].get.parameters;

    expect(parameters).toHaveLength(1);
    expect(parameters[0]).toMatchObject({
      name: "id",
      in: "path",
      required: true,
      schema: {
        type: "string",
      },
    });
  });
});
