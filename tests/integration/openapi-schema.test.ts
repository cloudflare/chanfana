import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { fromIttyRouter, OpenAPIRoute } from "../../src";
import { ToDoGet, todoRouter } from "../router";
import { buildRequest } from "../utils";

class HiddenFromSchemaEndpoint extends OpenAPIRoute {
  schema = {
    "x-ignore": true,
    responses: {
      "200": {
        description: "Hidden response",
      },
    },
  };

  async handle() {
    return { hidden: true };
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

  it("omits x-ignore routes from the generated schema while keeping them registered", async () => {
    const router = fromIttyRouter(AutoRouter(), {
      generateOperationIds: false,
    });
    router.get("/hidden", HiddenFromSchemaEndpoint);

    const schemaRequest = await router.fetch(buildRequest({ method: "GET", path: "/openapi.json" }));
    const schema = await schemaRequest.json();

    expect(schema.paths["/hidden"]).toBeUndefined();

    const routeRequest = await router.fetch(buildRequest({ method: "GET", path: "/hidden" }));
    const routeResp = await routeRequest.json();

    expect(routeRequest.status).toBe(200);
    expect(routeResp).toEqual({ hidden: true });
  });
});
