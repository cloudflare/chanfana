import {
  OpenAPIRouteSchema,
  RouteOptions,
  RouteValidated,
  ValidatedData,
} from './types'
import { extractQueryParameters } from './parameters'
import { z, ZodObject, ZodType } from 'zod'
import { isAnyZodType, legacyTypeIntoZod } from './zod/utils'
import { RouteConfig } from '@asteasolutions/zod-to-openapi'
import { jsonResp } from './utils'
import { RouteParameter } from '@asteasolutions/zod-to-openapi/dist/openapi-registry'

export class OpenAPIRoute {
  handle(...args: any[]): any {
    throw new Error('Method not implemented.')
  }

  static isRoute = true

  // static schema: OpenAPIRouteSchema
  params: RouteOptions

  constructor(params: RouteOptions) {
    this.params = params
  }

  // static getSchema(): OpenAPIRouteSchema {
  //   return this.schema
  // }
  //
  schema: OpenAPIRouteSchema = {}

  getValidatedData<S = this>(): ValidatedData<S> {
    return undefined
  }

  // getSchema(): OpenAPIRouteSchema {
  //   // @ts-ignore
  //   return this.__proto__.constructor.getSchema()
  // }

  getSchemaZod(): RouteConfig {
    // @ts-ignore
    return this.__proto__.constructor.getSchemaZod()
  }

  static getSchemaZod(): RouteConfig {
    // Deep copy
    const schema = { ...this.getSchema() }

    if (!schema.responses) {
      // No response was provided in the schema, default to a blank one
      schema.responses = {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {},
            },
          },
        },
      }
    }

    // @ts-ignore
    return schema
  }

  handleValidationError(errors: Record<string, any>): Response {
    return jsonResp(
      {
        errors: errors,
        success: false,
        result: {},
      },
      {
        status: 400,
      }
    )
  }

  async execute(...args: any[]) {
    const { data, errors } = await this.validateRequest(
      this.params.router.getRequest(args)
    )

    console.log(data)
    console.log(errors)

    if (errors) {
      return this.handleValidationError(errors)
    }

    args.push(data)

    // @ts-ignore
    const resp = await this.handle(...args)

    if (!(resp instanceof Response) && typeof resp === 'object') {
      return jsonResp(resp)
    }

    return resp
  }

  extractQueryParameters(
    request: Request,
    schema?: RouteParameter
  ): Record<string, any> | null {
    return extractQueryParameters(request, schema)
  }

  async validateRequest(request: Request): Promise<RouteValidated> {
    // @ts-ignore
    const schema: RouteConfig = this.__proto__.constructor.getSchemaZod()
    const unvalidatedData: any = {}

    const rawSchema: any = {}
    if (schema.request?.params) {
      rawSchema['params'] = schema.request?.params
      // @ts-ignore
      unvalidatedData['params'] = request.params
    }
    if (schema.request?.query) {
      rawSchema['query'] = schema.request?.query
      unvalidatedData['query'] = {}
    }
    if (schema.request?.headers) {
      rawSchema['headers'] = schema.request?.headers
      unvalidatedData['headers'] = {}
    }

    const queryParams = this.extractQueryParameters(
      request,
      schema.request?.query
    )
    if (queryParams) unvalidatedData['query'] = queryParams

    if (schema.request?.headers) {
      unvalidatedData['headers'] = {}
      // @ts-ignore
      for (const header of Object.keys(schema.request?.headers.shape)) {
        // @ts-ignore
        unvalidatedData.headers[header] = request.headers.get(header)
      }
    }

    if (
      request.method.toLowerCase() !== 'get' &&
      schema.request?.body &&
      schema.request?.body.content['application/json'] &&
      schema.request?.body.content['application/json'].schema
    ) {
      rawSchema['body'] = schema.request.body.content['application/json'].schema

      try {
        unvalidatedData['body'] = await request.json()
      } catch (e) {
        unvalidatedData['body'] = {}
      }
    }

    if (this.params?.skipValidation === true) {
      return {
        data: unvalidatedData,
        errors: undefined,
      }
    }

    let validationSchema: any = z.object(rawSchema)

    if (
      this.params?.raiseUnknownParameters === undefined ||
      this.params?.raiseUnknownParameters === true
    ) {
      validationSchema = validationSchema.strict()
    }

    const validatedData = validationSchema.safeParse(unvalidatedData)

    return {
      data: validatedData.success ? validatedData.data : undefined,
      errors: !validatedData.success ? validatedData.error.issues : undefined,
    }
  }
}
