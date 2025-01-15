import { Hono } from "hono";
import { AutoRouter } from "itty-router";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { fromHono } from "../../src";
import { fromIttyRouter } from "../../src/adapters/ittyRouter";
import { OpenAPIRoute } from "../../src/route";
import { jsonResp } from "../../src/utils";
import { buildRequest } from "../utils";

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

innerRouter.get("/todo/:id", ToDoGet);
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

import { hc } from "hono/client";

describe("innerRouter", () => {
  it("nested routers type", async () => {
    const authorsApp = fromHono(new Hono()).get("/", ToDoGet).post("/", ToDoGet).get("/:id", ToDoGet);

    const booksApp = new Hono()
      .get("/", (c) => c.json({ result: "list books" }))
      .post("/", (c) => c.json({ result: "create a book" }, 201));

    const app = new Hono().route("/authors", authorsApp).route("/books", booksApp);

    type AppType = typeof app;

    const c = hc<AppType>("http://asd.com");
    // expectTypeOf(c).toEqualTypeOf(typeof Hono);  // TODO
  });
});
