import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromIttyRouter } from "../../src";
import { OpenAPIRoute } from "../../src/route";
import { buildRequest } from "../utils";

const zodRouter = fromIttyRouter(AutoRouter());

class ToDoGet extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "Get a single ToDo",
    request: {
      params: z.object({
        id: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: z.string(),
              description: z.string(), //.optional(),
              type: z.nativeEnum({
                nextWeek: "nextWeek",
                nextMonth: "nextMonth",
              }),
            }),
          },
        },
      },
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

zodRouter.put("/todo/:id", ToDoGet);

describe("zod validations", () => {
  it("simpleSuccessfulCall", async () => {
    const request = await zodRouter.fetch(buildRequest({ method: "PUT", path: "/todo/1" }));

    const resp = await request.json();

    expect(request.status).toEqual(200);
    expect(resp).toEqual({
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    });
  });
});
