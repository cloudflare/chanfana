import { OpenAPIRouteSchema, RouteOptions, ValidatedData } from './types'
import { coerceInputs } from './parameters'
import { AnyZodObject, z } from 'zod'
import { RouteConfig } from '@asteasolutions/zod-to-openapi'
import { jsonResp } from './utils'

export class OpenAPIRoute {
  handle(
    ...args: any[]
  ): Response | Promise<Response> | object | Promise<object> {
    throw new Error('Method not implemented.')
  }

  static isRoute = true

  args: any[] = [] // Args the execute() was called with
  validatedData: any = undefined // this acts as a cache, in case the users calls the validate method twice
  params: RouteOptions
  schema: OpenAPIRouteSchema = {}

  constructor(params: RouteOptions) {
    this.params = params
  }

  async getValidatedData<S = any>(): Promise<ValidatedData<S>> {
    const request = this.params.router.getRequest(this.args)

    if (this.validatedData !== undefined) return this.validatedData

    const data = await this.validateRequest(request)

    this.validatedData = data
    return data
  }

  getSchema(): OpenAPIRouteSchema {
    // Use this function to overwrite schema properties
    return this.schema
  }

  getSchemaZod(): RouteConfig {
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

  handleValidationError(errors: z.ZodIssue[]): Response {
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
    this.validatedData = undefined
    this.args = args

    let resp
    try {
      resp = await this.handle(...args)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return this.handleValidationError(e.errors)
      }

      throw e
    }

    if (!(resp instanceof Response) && typeof resp === 'object') {
      return jsonResp(resp)
    }

    return resp
  }

  async validateRequest(request: Request) {
    const schema: RouteConfig = this.getSchemaZod()
    const unvalidatedData: any = {}

    const rawSchema: any = {}
    if (schema.request?.params) {
      rawSchema['params'] = schema.request?.params
      unvalidatedData['params'] = coerceInputs(
        this.params.router.getUrlParams(this.args),
        schema.request?.params
      )
    }
    if (schema.request?.query) {
      rawSchema['query'] = schema.request?.query
      unvalidatedData['query'] = {}
    }
    if (schema.request?.headers) {
      rawSchema['headers'] = schema.request?.headers
      unvalidatedData['headers'] = {}
    }

    const { searchParams } = new URL(request.url)
    const queryParams = coerceInputs(searchParams, schema.request?.query)
    if (queryParams !== null) unvalidatedData['query'] = queryParams

    if (schema.request?.headers) {
      const tmpHeaders: Record<string, any> = {}

      // @ts-ignore
      for (const header of Object.keys(schema.request?.headers.shape)) {
        tmpHeaders[header] = request.headers.get(header)
      }

      unvalidatedData['headers'] = coerceInputs(
        tmpHeaders,
        schema.request?.headers as AnyZodObject
      )
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

    let validationSchema: any = z.object(rawSchema)

    if (
      this.params?.raiseUnknownParameters === undefined ||
      this.params?.raiseUnknownParameters === true
    ) {
      validationSchema = validationSchema.strict()
    }

    return await validationSchema.parseAsync(unvalidatedData)
  }
}
