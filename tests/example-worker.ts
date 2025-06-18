import { Router, json } from "itty-router";
import { z } from "zod";
import { OpenAPIRoute, contentJson, fromIttyRouter } from "../src";

export class HelloRoute extends OpenAPIRoute {
  schema = {
    summary: "Say hello",
    request: {
      query: z.object({
        name: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Returns a greeting",
        ...contentJson(
          z.object({
            greatings: z.string(),
          }),
        ),
      },
    },
  };

  async handle(request: Request, env: any, context: any) {
    const data = await this.getValidatedData<typeof this.schema>();
    return json({ greeting: `Hello ${data.query.name}` });
  }
}

// Create an itty-router router
const router = Router();

// Initialize Chanfana for itty-router
const openapi = fromIttyRouter(router);
openapi.get("/hello", HelloRoute);

export default router;
