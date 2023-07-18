import { OpenAPIRouter } from '../src/openapi'
import { OpenAPIRoute } from '../src/route'
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
  Query,
  Regex,
  Str,
  Uuid,
  Path,
} from '../src/parameters'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List all ToDos',
    parameters: {
      p_number: Query(Number),
      p_string: Query(String),
      p_boolean: Query(Boolean),
      p_int: Query(Int),
      p_num: Query(Num),
      p_str: Query(Str),
      p_bool: Query(Bool),
      p_enumeration: Query(Enumeration, {
        values: {
          json: 'ENUM_JSON',
          csv: 'ENUM_CSV',
        },
      }),
      p_enumeration_insensitive: Query(Enumeration, {
        values: {
          json: 'json',
          csv: 'csv',
        },
        enumCaseSensitive: false,
      }),
      p_datetime: Query(DateTime),
      p_dateonly: Query(DateOnly),
      p_regex: Query(Regex, {
        pattern:
          /^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/,
      }),
      p_email: Query(Email),
      p_uuid: Query(Uuid),
      p_hostname: Query(Hostname),
      p_ipv4: Query(Ipv4),
      p_ipv6: Query(Ipv6),
      p_optional: Query(Int, {
        required: false,
      }),
    },
    responses: {
      '200': {
        description: 'example',
        schema: {
          params: {},
          results: ['lorem'],
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return {
      params: data,
      results: ['lorem', 'ipsum'],
    }
  }
}

export class ToDoGet extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Get a single ToDo',
    parameters: {
      id: Path(Number),
    },
    responses: {
      '200': {
        description: 'example',
        schema: {
          todo: {
            lorem: String,
            ipsum: String,
          },
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return {
      todo: {
        lorem: 'lorem',
        ipsum: 'ipsum',
      },
    }
  }
}

export class ToDoCreate extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Create a new ToDo',
    requestBody: {
      title: String,
      description: new Str({ required: false }),
      type: new Enumeration({
        values: {
          nextWeek: 'nextWeek',
          nextMonth: 'nextMonth',
        },
      }),
    },
    responses: {
      '200': {
        description: 'example',
        schema: {
          todo: {
            title: 'My new todo',
            description: 'This really needs to be done next week',
            type: 'nextWeek',
          },
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return {
      todo: data.body,
    }
  }
}

export const todoRouter = OpenAPIRouter({ openapiVersion: '3' })
todoRouter.get('/todos', ToDoList)
todoRouter.get('/todos/:id', ToDoGet)
todoRouter.post('/todos', ToDoCreate)

// 404 for everything else
todoRouter.all('*', () => new Response('Not Found.', { status: 404 }))
