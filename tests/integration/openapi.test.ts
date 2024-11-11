import "isomorphic-fetch";
import jestOpenAPI from "jest-openapi";
import { todoRouter } from "../router";

describe("openapiValidation", () => {
	it("loadSpec", async () => {
		jestOpenAPI(todoRouter.schema);
	});
});
