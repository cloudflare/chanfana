import { json } from "itty-router";
import { OpenAPIRoute, OpenAPIRouter, Query, Str } from "src/index.ts"; // Assuming 'chanfana' will resolve to 'src' or 'dist' based on test setup
// Define a simple OpenAPI route
export class HelloRoute extends OpenAPIRoute {
  static schema = {
    summary: "Say hello",
    parameters: {
      name: Query(Str, { description: "Your name", required: false, example: "World" }),
    },
    responses: {
      200: {
        description: "Returns a greeting",
        schema: {
          greeting: new Str({ example: "Hello World" }),
        },
      },
    },
  };
  async handle(request, env, context, data) {
    const name = data.params.name || "World";
    return json({ greeting: `Hello ${name}` });
  }
}
// Create a router using OpenAPIRouter (which wraps itty-router's AutoRouter by default)
const router = OpenAPIRouter();
router.get("/hello", HelloRoute);
// Standard worker fetch export
export default {
  fetch: router.fetch,
};
