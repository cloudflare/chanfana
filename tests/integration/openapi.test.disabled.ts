import { describe, it } from "vitest";
import vitestOpenAPI from "vitest-openapi";
import { todoRouter } from "../router";

describe("openapiValidation", () => {
  it("loadSpec", async () => {
    console.log(todoRouter.schema);
    vitestOpenAPI(todoRouter.schema);
  });
});
