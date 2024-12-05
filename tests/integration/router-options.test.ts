import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { fromIttyRouter } from "../../src";
import { OpenAPIRoute } from "../../src/route";
import { buildRequest } from "../utils";

class EndpointWithoutOperationId extends OpenAPIRoute {
  schema = {
    summary: "Get a single ToDo",
    responses: {},
  };

  async handle(request: Request, env: any, context: any) {
    return {
      msg: "EndpointWithoutOperationId",
    };
  }
}

class EndpointWithOperationId extends OpenAPIRoute {
  schema = {
    responses: {},
    operationId: "get_my_todo",
    summary: "Get a single ToDo",
  };

  async handle(request: Request, env: any, context: any) {
    return {
      msg: "EndpointWithOperationId",
    };
  }
}

describe("routerOptions", () => {
  it("generate operation ids false", async () => {
    const t = () => {
      const router = fromIttyRouter(AutoRouter(), {
        generateOperationIds: false,
      });
      router.get("/todo", EndpointWithoutOperationId);
    };

    expect(t).toThrow("Route /todo don't have operationId set!");
  });

  it("generate operation ids true and unset", async () => {
    const routerTrue = fromIttyRouter(AutoRouter(), {
      generateOperationIds: true,
    });
    routerTrue.get("/todo", EndpointWithoutOperationId);

    if (routerTrue.schema.paths?.["/todo"]?.get) {
      expect(routerTrue.schema.paths["/todo"].get.operationId).toEqual("get_EndpointWithoutOperationId");
    } else {
      throw new Error("/todo not found in schema");
    }

    const routerUnset = fromIttyRouter(AutoRouter());
    routerUnset.get("/todo", EndpointWithoutOperationId);

    if (routerUnset.schema.paths?.["/todo"]?.get) {
      expect(routerUnset.schema.paths["/todo"].get.operationId).toEqual("get_EndpointWithoutOperationId");
    } else {
      throw new Error("/todo not found in schema");
    }
  });

  it("generate operation ids true on endpoint with operation id", async () => {
    const router = fromIttyRouter(AutoRouter(), {
      generateOperationIds: true,
    });
    router.get("/todo", EndpointWithOperationId);

    if (router.schema.paths?.["/todo"]?.get) {
      expect(router.schema.paths["/todo"].get.operationId).toEqual("get_my_todo");
    } else {
      throw new Error("/todo not found in schema");
    }
  });

  it("with base empty", async () => {
    const router = fromIttyRouter(AutoRouter());
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/todo" }));
    const resp = await request.json();

    expect(resp.msg).toEqual("EndpointWithOperationId");
  });

  it("with base defined", async () => {
    const router = fromIttyRouter(AutoRouter({ base: "/api" }), {
      base: "/api",
    });
    router.get("/todo", EndpointWithOperationId);

    const request = await router.fetch(buildRequest({ method: "GET", path: "/api/todo" }));
    const resp = await request.json();

    expect(resp.msg).toEqual("EndpointWithOperationId");
  });
});
