import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromIttyRouter } from "../../src/adapters/ittyRouter";
import { OpenAPIRoute } from "../../src/route";
import { jsonResp } from "../../src/utils";
import { buildRequest } from "../utils";

const innerRouter = fromIttyRouter(AutoRouter({ base: "/api/v1" }), {
  base: "/api/v1",
});

class ToDoGet extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "Get a single ToDo",
    request: {
      params: z.object({
        id: z.number(),
      }),
    },
    responses: {
      "200": {
        description: "example",
        content: {
          "application/json": {
            schema: {
              todo: {
                lorem: String,
                ipsum: String,
              },
            },
          },
        },
      },
    },
  };

  async handle(request: Request, env: any, context: any) {
    return {
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    };
  }
}

innerRouter.get("/todo/:id", ToDoGet);
innerRouter.all("*", () => jsonResp({ message: "Not Found" }, { status: 404 }));

const router = fromIttyRouter(AutoRouter(), {
  schema: {
    info: {
      title: "Radar Worker API",
      version: "1.0",
    },
  },
});

router.all("/api/v1/*", innerRouter);
router.all("*", () => new Response("Not Found.", { status: 404 }));

describe("innerRouter", () => {
  it("simpleSuccessfulCall", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/api/v1/todo/1" }));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp).toEqual({
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    });
  });

  it("innerCatchAll", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/api/v1/asd" }));
    const resp = await request.json();

    expect(request.status).toEqual(404);
    expect(resp).toEqual({ message: "Not Found" });
  });

  it("outerCatchAll", async () => {
    const request = await router.fetch(buildRequest({ method: "GET", path: "/asd" }));
    const resp = await request.text();

    expect(request.status).toEqual(404);
    expect(resp).toEqual("Not Found.");
  });

  it("nested router with base path", async () => {
    const innerRouter = fromIttyRouter(AutoRouter(), {
      base: "/api/v1",
    });
    innerRouter.get("/todo/:id", ToDoGet);

    const router = fromIttyRouter(AutoRouter());
    router.all("/api/v1/*", innerRouter);

    const request = await router.fetch(new Request("http://localhost:8080/openapi.json"));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp).toEqual({
      components: {
        parameters: {},
        schemas: {},
      },
      info: {
        title: "OpenAPI",
        version: "1.0.0",
      },
      openapi: "3.1.0",
      paths: {
        "/api/v1/todo/{id}": {
          get: {
            operationId: "get_ToDoGet",
            parameters: [
              {
                in: "path",
                name: "id",
                required: true,
                schema: {
                  type: "number",
                },
              },
            ],
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      todo: {},
                    },
                  },
                },
                description: "example",
              },
            },
            summary: "Get a single ToDo",
            tags: ["ToDo"],
          },
        },
      },
      webhooks: {},
    });
  });
});
