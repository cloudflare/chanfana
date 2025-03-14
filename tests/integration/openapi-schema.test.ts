import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { fromIttyRouter } from "../../src";
import { ToDoGet, ToDoList, todoRouter } from "../router";
import { buildRequest, findError } from "../utils";

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
});
