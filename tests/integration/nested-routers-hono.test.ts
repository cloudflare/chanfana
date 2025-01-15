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
});
