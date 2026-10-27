import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromHono } from "../../src";
import { OpenAPIRoute } from "../../src/route";
import { jsonResp } from "../../src/utils";

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
            schema: z.object({
              todo: z.object({
                lorem: z.string(),
                ipsum: z.string(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(_request: Request, _env: any, _context: any) {
    return {
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    };
  }
}

const innerRouter = fromHono(new Hono());

innerRouter.all("/todo/:id", ToDoGet);
innerRouter.all("*", () => jsonResp({ message: "Not Found" }, { status: 404 }));

const router = fromHono(new Hono(), {
  schema: {
    info: {
      title: "Radar Worker API",
      version: "1.0",
    },
  },
});

router.route("/api/v1", innerRouter);
router.all("*", () => new Response("Not Found.", { status: 404 }));

describe("innerRouter", () => {
  it("simpleSuccessfulCall", async () => {
    const request = await router.fetch(new Request("http://localhost:8080/api/v1/todo/1"));
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp).toEqual({
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    });
  });

  it("test .all()", async () => {
    const request = await router.fetch(
      new Request("http://localhost:8080/api/v1/todo/1", {
        method: "POST",
      }),
    );
    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp).toEqual({
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    });
    const request2 = await router.fetch(
      new Request("http://localhost:8080/api/v1/todo/1", {
        method: "PATCH",
      }),
    );
    const resp2 = await request2.json();

    expect(request2.status).toEqual(200);
    expect(resp2).toEqual({
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    });
  });

  it("innerCatchAll", async () => {
    const request = await router.fetch(new Request("http://localhost:8080/api/v1/asd"));
    const resp = await request.json();

    expect(request.status).toEqual(404);
    expect(resp).toEqual({ message: "Not Found" });
  });

  it("outerCatchAll", async () => {
    const request = await router.fetch(new Request("http://localhost:8080/asd"));
    const resp = await request.text();

    expect(request.status).toEqual(404);
    expect(resp).toEqual("Not Found.");
  });

  it("nested router with base path", async () => {
    const innerRouter = fromHono(new Hono());
    innerRouter.get("/todo/:id", ToDoGet);

    const router = fromHono(new Hono());
    router.route("/api/v1/:prefix", innerRouter);

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
        "/api/v1/{prefix}/todo/{id}": {
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
                      properties: {
                        todo: {
                          properties: {
                            ipsum: {
                              type: "string",
                            },
                            lorem: {
                              type: "string",
                            },
                          },
                          required: ["lorem", "ipsum"],
                          type: "object",
                        },
                      },
                      required: ["todo"],
                      type: "object",
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

class ListEndpoint extends OpenAPIRoute {
  schema = {
    responses: {},
  };

  async handle() {
    return { ok: true };
  }
}

class ExplicitListEndpoint extends OpenAPIRoute {
  schema = {
    operationId: "get_list",
    responses: {},
  };

  async handle() {
    return { ok: true };
  }
}

describe("nested router operationIds", () => {
  it("keeps generated operationIds unique across nested routers", async () => {
    // Classes assigned to an object property all get the same name ("route")
    const Route = { route: class extends ListEndpoint {} }.route;

    const usersRouter = fromHono(new Hono());
    usersRouter.get("/users", Route);
    const postsRouter = fromHono(new Hono());
    postsRouter.get("/posts", Route);
    postsRouter.get("/explicit", ExplicitListEndpoint);

    const app = fromHono(new Hono());
    app.get("/list", class list extends ListEndpoint {}); // generates "get_list"
    app.route("/api", usersRouter);
    app.route("/api", postsRouter);
    app.get("/config", Route);

    const paths = app.schema.paths;
    expect(paths["/api/users"].get.operationId).toEqual("get_route");
    expect(paths["/api/posts"].get.operationId).toEqual("get_api_posts");
    expect(paths["/config"].get.operationId).toEqual("get_config");
    // The nested explicit id takes precedence over the parent's generated one
    expect(paths["/api/explicit"].get.operationId).toEqual("get_list");
    expect(paths["/list"].get.operationId).toEqual("get_list_2");
  });

  it("renames nested generated operationIds that collide with a parent explicit id", async () => {
    const childRouter = fromHono(new Hono());
    childRouter.get("/list", class list extends ListEndpoint {}); // generates "get_list"

    const app = fromHono(new Hono());
    app.get("/explicit", ExplicitListEndpoint);
    app.route("/api", childRouter);

    const paths = app.schema.paths;
    expect(paths["/explicit"].get.operationId).toEqual("get_list");
    expect(paths["/api/list"].get.operationId).toEqual("get_api_list");
    expect(childRouter.schema.paths["/list"].get.operationId).toEqual("get_list");
  });
});
