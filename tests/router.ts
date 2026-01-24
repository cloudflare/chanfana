import { AutoRouter } from "itty-router";
import { z } from "zod";
import { extendZodWithOpenApi, OpenAPIRoute } from "../src";
import { fromIttyRouter } from "../src/adapters/ittyRouter";
import { contentJson } from "../src/contentTypes";

extendZodWithOpenApi(z);

// Hostname regex pattern (used by the old Hostname() helper)
const hostnamePattern =
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;

export class ToDoList extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "List all ToDos",
    request: {
      query: z.object({
        p_array_dates: z.iso.date().array(),
        p_number: z.number(),
        p_string: z.string(),
        p_boolean: z.boolean(),
        p_int: z.number().int().openapi({ type: "integer" }),
        p_num: z.number().openapi({ type: "number" }),
        p_str: z.string(),
        p_bool: z.boolean().openapi({ type: "boolean" }),
        p_enumeration: z.enum(["json", "csv"]).transform((val) => ({ json: "ENUM_JSON", csv: "ENUM_CSV" })[val]),
        p_enumeration_insensitive: z
          .preprocess((val) => String(val).toLowerCase(), z.enum(["json", "csv"]))
          .openapi({ enum: ["json", "csv"] }),
        p_datetime: z.iso.datetime({
          error: "Must be in the following format: YYYY-mm-ddTHH:MM:ssZ",
        }),
        p_dateonly: z.iso.date(),
        p_regex: z.string().regex(/^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/, "Invalid"),
        p_email: z.email(),
        p_uuid: z.uuid(),
        p_hostname: z.string().regex(hostnamePattern),
        p_ipv4: z.ipv4(),
        p_ipv6: z.ipv6(),
        p_optional: z.number().optional(),
      }),
    },
    responses: {
      "200": {
        description: "example",
        ...contentJson({
          params: {},
          results: ["lorem"],
        }),
      },
    },
  };

  async handle(_request: Request, _env: any, _context: any) {
    const data = await this.getValidatedData<typeof this.schema>();

    return {
      params: data,
      results: ["lorem", "ipsum"],
    };
  }
}

export class ToDoGet extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "Get a single ToDo",
    request: {
      params: z.object({
        id: z.number().openapi({ type: "number" }),
      }),
    },
    responses: {
      "200": {
        description: "Successful Response",
        content: {
          "application/json": {
            schema: z.object({
              todo: z.object({
                lorem: z.string(),
                ipsum: z.string(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(_request: Request, _env: any, _context: any) {
    return {
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    };
  }
}

export class ContentTypeGet extends OpenAPIRoute {
  schema = {
    responses: {
      "200": {
        description: "Successful Response",
        content: {
          "text/csv": {
            schema: z.string(),
          },
        },
      },
    },
  };

  async handle(_request: Request, _env: any, _context: any) {
    return {
      todo: {
        lorem: "lorem",
        ipsum: "ipsum",
      },
    };
  }
}

export class ToDoCreate extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "Create a new ToDo",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: z.string(),
              description: z.string().optional(),
              type: z
                .enum(["nextWeek", "nextMonth"])
                .transform((val) => ({ nextWeek: "nextWeek", nextMonth: "nextMonth" })[val]),
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
            schema: z.object({
              todo: z.object({
                title: z.string(),
                description: z.string(),
                type: z.string(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(_request: Request, _env: any, _context: any) {
    const data = await this.getValidatedData<typeof this.schema>();

    return {
      todo: data.body,
    };
  }
}

const query = z.object({
  p_int: z.number().int().openapi({ type: "integer" }),
  p_num: z.number().openapi({ type: "number" }),
  p_str: z.string(),
  p_arrstr: z.array(z.string()),
  p_bool: z.boolean().openapi({ type: "boolean" }),
  p_enumeration: z.enum(["json", "csv"]).transform((val) => ({ json: "ENUM_JSON", csv: "ENUM_CSV" })[val]),
  p_enumeration_insensitive: z
    .preprocess((val) => String(val).toLowerCase(), z.enum(["json", "csv"]))
    .openapi({ enum: ["json", "csv"] }),
  p_datetime: z.iso.datetime({
    error: "Must be in the following format: YYYY-mm-ddTHH:MM:ssZ",
  }),
  p_regex: z.string().regex(/^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/, "Invalid"),
  p_email: z.email(),
  p_uuid: z.uuid(),

  p_ipv4: z.ipv4(),
  p_ipv6: z.ipv6(),
  p_optional: z.number().int().optional().openapi({ type: "integer" }),
});

export class ToDoCreateTyped extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "List all ToDos",
    request: {
      query: query,
      headers: z.object({
        p_hostname: z.string().regex(hostnamePattern),
      }),
      body: {
        content: {
          "application/json": {
            schema: z.object({
              title: z.string(),
              description: z.string().optional(),
              type: z.enum(["nextWeek", "nextMoth"]),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "example",
        ...contentJson({
          params: {},
          results: ["lorem"],
        }),
      },
    },
  };

  async handle(_request: Request, _env: any, _context: any) {
    return {};
  }
}

export class ToDoHeaderCheck extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "List all ToDos",
    request: {
      headers: z.object({
        p_hostname: z.string().regex(hostnamePattern),
      }),
    },
  };

  async handle(_request: Request, _env: any, _context: any) {
    const data = await this.getValidatedData<typeof this.schema>();

    return {
      headers: data.headers,
    };
  }
}

export const todoRouter = fromIttyRouter(AutoRouter(), { openapiVersion: "3" });
todoRouter.get("/todos", ToDoList);
todoRouter.get("/todos/:id", ToDoGet);
todoRouter.post("/todos", ToDoCreate);
todoRouter.post("/todos-typed", ToDoCreateTyped);
todoRouter.get("/contenttype", ContentTypeGet);
todoRouter.get("/header", ToDoHeaderCheck);

// 404 for everything else
todoRouter.all("*", () => new Response("Not Found.", { status: 404 }));
