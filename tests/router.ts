import { AutoRouter } from "itty-router";
import { z } from "zod";
import { OpenAPIRoute, extendZodWithOpenApi } from "../src";
import { fromIttyRouter } from "../src/adapters/ittyRouter";
import { contentJson } from "../src/contentTypes";
import {
  Bool,
  DateOnly,
  DateTime,
  Email,
  Enumeration,
  Hostname,
  Int,
  Ipv4,
  Ipv6,
  Num,
  Regex,
  Str,
  Uuid,
} from "../src/parameters";

extendZodWithOpenApi(z);

export class ToDoList extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "List all ToDos",
    request: {
      query: z.object({
        p_array_dates: z.string().date().array(),
        p_number: z.number(),
        p_string: z.string(),
        p_boolean: z.boolean(),
        p_int: Int(),
        p_num: Num(),
        p_str: Str(),
        p_bool: Bool(),
        p_enumeration: Enumeration({
          values: {
            json: "ENUM_JSON",
            csv: "ENUM_CSV",
          },
        }),
        p_enumeration_insensitive: Enumeration({
          values: {
            json: "json",
            csv: "csv",
          },
          enumCaseSensitive: false,
        }),
        p_datetime: DateTime(),
        p_dateonly: DateOnly(),
        p_regex: Regex({
          pattern: /^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/,
        }),
        p_email: Email(),
        p_uuid: Uuid(),
        p_hostname: Hostname(),
        p_ipv4: Ipv4(),
        p_ipv6: Ipv6(),
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

  async handle(request: Request, env: any, context: any) {
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
        id: Num(),
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
                ipsum: Str(),
              }),
            }),
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

  async handle(request: Request, env: any, context: any) {
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
              title: Str(),
              description: Str({ required: false }),
              type: Enumeration({
                values: {
                  nextWeek: "nextWeek",
                  nextMonth: "nextMonth",
                },
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
            schema: z.object({
              todo: z.object({
                title: Str(),
                description: Str(),
                type: Str(),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(request: Request, env: any, context: any) {
    const data = await this.getValidatedData<typeof this.schema>();

    return {
      todo: data.body,
    };
  }
}

const query = z.object({
  p_int: Int(),
  p_num: Num(),
  p_str: Str(),
  p_arrstr: z.array(Str()),
  p_bool: Bool(),
  p_enumeration: Enumeration({
    values: {
      json: "ENUM_JSON",
      csv: "ENUM_CSV",
    },
  }),
  p_enumeration_insensitive: Enumeration({
    values: {
      json: "json",
      csv: "csv",
    },
    enumCaseSensitive: false,
  }),
  p_datetime: DateTime(),
  p_regex: Regex({
    pattern: /^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/,
  }),
  p_email: Email(),
  p_uuid: Uuid(),

  p_ipv4: Ipv4(),
  p_ipv6: Ipv6(),
  p_optional: Int({
    required: false,
  }),
});

export class ToDoCreateTyped extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "List all ToDos",
    request: {
      query: query,
      headers: z.object({
        p_hostname: Hostname(),
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

  async handle(request: Request, env: any, context: any) {
    return {};
  }
}

export class ToDoHeaderCheck extends OpenAPIRoute {
  schema = {
    tags: ["ToDo"],
    summary: "List all ToDos",
    request: {
      headers: z.object({
        p_hostname: Hostname(),
      }),
    },
  };

  async handle(request: Request, env: any, context: any) {
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
