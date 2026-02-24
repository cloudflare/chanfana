import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";

/**
 * Example custom endpoint (non-D1).
 *
 * This shows how to build a regular OpenAPIRoute when you don't need
 * automatic CRUD against a D1 database. Define `schema` for OpenAPI
 * generation and implement `handle()` with your own logic.
 */
export class Hello extends OpenAPIRoute {
  schema = {
    tags: ["General"],
    summary: "Say hello",
    request: {
      query: z.object({
        name: z.string().optional().default("world").describe("Name to greet"),
      }),
    },
    responses: {
      "200": {
        description: "Greeting response",
        ...contentJson(
          z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        ),
      },
    },
  };

  async handle(c: any) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { name } = data.query;

    return {
      success: true,
      message: `Hello, ${name}!`,
    };
  }
}
