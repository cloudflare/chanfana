import { fromIttyRouter } from '../src/adapters/ittyRouter'
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
  Regex,
  Str,
  Uuid,
} from '../src/parameters'
import { OpenAPIRouteSchema, RequestTypes } from '../src'
import { AnyZodObject, z } from 'zod'
import { AutoRouter } from 'itty-router'
import { contentJson } from '../src/contentTypes'
import { legacyTypeIntoZod } from '../src/zod/utils'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List all ToDos',
    request: {
      query: z.object({

        // p_number: Number,
        // p_string: String,
        // p_boolean: Boolean,
        p_int: Int(),
        p_num: Num(),
        p_str: Str(),
        p_bool: Bool(),
        p_enumeration: Enumeration({
          values: {
            json: 'ENUM_JSON',
            csv: 'ENUM_CSV',
          },
        }),
        p_enumeration_insensitive: Enumeration({
          values: {
            json: 'json',
            csv: 'csv',
          },
          enumCaseSensitive: false,
        }),
        p_datetime: DateTime(),
        p_dateonly: DateOnly(),
        p_regex: Regex({
          pattern:
            /^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/,
        }),
        p_email: Email(),
        p_uuid: Uuid(),
        p_hostname: Hostname(),
        p_ipv4: Ipv4(),
        p_ipv6: Ipv6(),
        p_optional: Int({
          required: false,
        }),
      }),
    },
    responses: {
      '200': {
        description: 'example',
        'application/json': {
          schema: {
            params: {},
            results: ['lorem'],
          },
        },
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
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
    request: {
      params: z.object({
        id: Num(),
      }),
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

  async handle(request: Request, env: any, context: any, data: any) {
    return {
      todo: {
        lorem: 'lorem',
        ipsum: 'ipsum',
      },
    }
  }
}

export class ContentTypeGet extends OpenAPIRoute {
  static schema = {
    responses: {
      '200': {
        description: 'Successful Response',
        'text/csv': z.string(),
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    return {
      todo: {
        lorem: 'lorem',
        ipsum: 'ipsum',
      },
    }
  }
}

export class ToDoCreate extends OpenAPIRoute {
  static schema: OpenAPIRouteSchema = {
    tags: ['ToDo'],
    summary: 'Create a new ToDo',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              title: Str(),
              description: Str({ required: false }),
              type: Enumeration({
                values: {
                  nextWeek: 'nextWeek',
                  nextMonth: 'nextMonth',
                },
              }),
            }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'example',
        content: {
          'application/json': {
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
  }

  async handle(request: Request, env: any, context: any, data: any) {
    return {
      todo: data.body,
    }
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
      json: 'ENUM_JSON',
      csv: 'ENUM_CSV',
    },
  }),
  p_enumeration_insensitive: Enumeration({
    values: {
      json: 'json',
      csv: 'csv',
    },
    enumCaseSensitive: false,
  }),
  p_datetime: DateTime(),
  p_regex: Regex({
    pattern:
      /^[\\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/,
  }),
  p_email: Email(),
  p_uuid: Uuid(),

  p_ipv4: Ipv4(),
  p_ipv6: Ipv6(),
  p_optional: Int({
    required: false,
  }),
})

export class ToDoCreateTyped extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'List all ToDos',
    request: {
      query: query,
      headers: z.object({
        p_hostname: Hostname(),
      }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              title: z.string(),
              description: z.string().optional(),
              type: z.enum(['nextWeek', 'nextMoth']),
            }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'example',
        ...contentJson({
          params: {},
          results: ['lorem'],
        }),
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
  ) {
    const data = this.getValidatedData<this>()
    const asd = data.query.p_int
    data.query.

    return {}
  }
}

type SchematPart<R extends OpenAPIRouteSchema, Part extends string> = Part extends keyof R
  ? R[Part]
  : {}

type RequestPart<R extends RequestTypes, Part extends string> = Part extends keyof R
  ? R[Part]
  : {}

type getRequest<T extends OpenAPIRouteSchema, P extends keyof T> = Pick<T, P> extends { P: RequestTypes } ? T[P] : never
type getInfer<T extends AnyZodObject | undefined> = undefined extends T ? undefined : z.infer<T>
type getInfer<T extends AnyZodObject | undefined> = undefined extends T ? undefined : z.infer<T>

declare type ModelName = GetModelName<ModelMappings>;
declare type GetModelClass<M extends ModelName, T> = {
  [K in keyof T]: T[K] extends {
      models: readonly string[];
      class: infer C;
    }
    ? M extends T[K]['models'][number]
      ? C
      : never
    : never;
}[keyof T];
declare type ConstructorParametersForModel<M extends ModelName> =
  ConstructorParameters<GetModelClass<M, ModelMappings>>[0];
declare type GetModelClassType<M extends ModelName> = {
  [K in keyof ModelMappings]: M extends ModelMappings[K]['models'][number]
    ? ModelMappings[K]['class']
    : never;
}[keyof ModelMappings];
declare type GetModelInstanceType<M extends ModelName> = InstanceType<
  GetModelClassType<M>
>;
declare type GetPostProcessedOutputsType<M extends ModelName> =
  GetModelInstanceType<M>['postProcessedOutputs'];
type IsPropertyUndefined<T, K extends keyof T> = undefined extends T[K] ? true : false;

type GetRequest<T extends OpenAPIRouteSchema> = T['request'];
type GetQuery<T extends RequestTypes> = T['query'];

type GetInnerQuery<T extends OpenAPIRouteSchema> = GetRequest<T>
  ? GetQuery<GetRequest<T>> : never
export type DataOf2<S extends OpenAPIRouteSchema> =
  S extends { request: RequestTypes }
    ? S['request']
    : false;

// export type DataOf2<S> =
//   S extends { schema: OpenAPIRouteSchema }
//  ? Extract<S['schema'], 'request'> extends { request: infer T }
//     ? Extract<T, 'query'> extends { query: infer Q extends ZodType<T['query'], any, any> }
//       ? z.infer<Q>
//   : never
//   : never
//   : never;

// export type SetNonNullable<BaseType, Keys extends keyof BaseType = keyof BaseType> = {
// 	[Key in keyof BaseType]: Key extends Keys
// 		? NonNullable<BaseType[Key]>
// 		: BaseType[Key];
// };
//
// type RequestPart<R extends OpenAPIRouteSchema, Part extends string> = Part extends keyof R['request']
//   ? R['request'][Part]
//   : {}
//
//   const Vector3Schema = z.object({
//     x: z.number(),
//     y: z.number(),
//     z: z.number(),
//   });
//   function parseVector3(data: Vector3): Vector3 {
//     data.
//     return {
//       ...Vector3Schema.parse(data),
//       normalize: function () { /*...*/ },
//       distance: function(v: Vector3) { /*...*/}
//     };
//   }
//
//   interface Vector3 extends z.infer<NonNullable<NonNullable<typeof ToDoCreateTyped.schema.request>['query']>> {
//     normalize: () => void;
//     distance: (v: Vector3) => number;
//   }


// function test(asd: DataOf2<ToDoCreateTyped['schema']>) {
//   asd
//   if (asd) {
//     asd
//     const dfg = asd.query  as z.infer<T['query']>
//   }
// }


// export type DataOf3<S> = PickDeep<S, 'request.query'>
//

//
// type OptionalPropertyOf<T extends object> = Exclude<{
//   [K in keyof T]: T extends Record<K, T[K]>
//     ? never
//     : K
// }[keyof T], undefined>
// type DataOf3<R extends OpenAPIRouteSchema> = InputTypeParam<R> &
//     InputTypeQuery<R> &
//     InputTypeHeader<R> &
//     InputTypeCookie<R>

// type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
//
// type GetModelClass<M extends ModelName, T> = {
//   [K in keyof T]: T[K] extends { models: readonly string[]; class: infer C }
//     ? M extends T[K]['models'][number]
//       ? C
//       : never
//     : never;
// }[keyof T];
//
// type Keys = keyof typeof ToDoCreateTyped.schema.request;
// declare type GetModelClass<M extends ModelName, T> = {
//   [K in keyof T]: T[K] extends {
//     models: readonly string[];
//     class: infer C;
//   }
//     ? M extends T[K]['models'][number]
//       ? C
//       : never
//     : never;
// }[keyof T];
// declare type ConstructorParametersForModel<M extends ModelName> =
//   ConstructorParameters<GetModelClass<M, ModelMappings>>[0];
// declare type GetModelClassType<M extends ModelName> = {
//   [K in keyof ModelMappings]: M extends ModelMappings[K]['models'][number]
//     ? ModelMappings[K]['class']
//     : never;
// }[keyof ModelMappings];
// declare type GetModelInstanceType<M extends ModelName> = InstanceType<
//   GetModelClassType<M>
// >;
// declare type GetPostProcessedOutputsType<M extends ModelName> =
//   GetModelInstanceType<M>['postProcessedOutputs'];

// type GetRequest<T extends OpenAPIRouteSchema> = T['request'];
// type GetInner<T extends OpenAPIRouteSchema> = {
//   [K in keyof T['request']]: T['request'][K] extends any
//     ? string
//     : never;
// }[keyof T['request']];


// type DataOf2<T extends OpenAPIRouteSchema['request']> = {
//   query?: z.ZodType<T['query']>,
//   params?: z.infer<T.request.params>,
//   headers?: z.infer<T.request.headers>,
//   body?: z.infer<T.request.body>,
// };


export const todoRouter = fromIttyRouter(AutoRouter(), { openapiVersion: '3' })
todoRouter.get('/todos', ToDoList)
todoRouter.get('/todos/:id', ToDoGet)
todoRouter.post('/todos', ToDoCreate)
todoRouter.post('/todos-typed', ToDoCreateTyped)
todoRouter.get('/contenttype', ContentTypeGet)

// 404 for everything else
todoRouter.all('*', () => new Response('Not Found.', { status: 404 }))
