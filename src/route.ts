import {
  OpenAPIRouteSchema,
  OpenAPISchema,
  RouteOptions,
  RouteValidated,
} from './types'
import { extractQueryParameters } from './parameters'
import { z } from 'zod'
import { isAnyZodType, legacyTypeIntoZod } from './zod/utils'
import { RouteConfig } from '@asteasolutions/zod-to-openapi'
import { jsonResp } from './utils'

export class OpenAPIRoute implements OpenAPIRouteSchema {
  static isRoute = true

  static schema: OpenAPISchema
  params: RouteOptions

  constructor(params: RouteOptions) {
    this.params = params
  }

  static getSchema(): OpenAPISchema {
    return this.schema
  }

  get schema(): OpenAPISchema {
    // @ts-ignore
    return this.__proto__.constructor.schema
  }

  getSchema(): OpenAPISchema {
    // @ts-ignore
    return this.__proto__.constructor.getSchema()
  }

  static getSchemaZod(): RouteConfig {
    // Deep copy
    const schema = { ...this.getSchema() }

    let parameters: any = {}
    let requestBody: object = schema.requestBody as object
    const responses: any = {}

    if (requestBody) {
      if (!isAnyZodType(requestBody)) {
        requestBody = legacyTypeIntoZod(requestBody)
      }

      requestBody = {
        content: {
          'application/json': {
            schema: requestBody,
          },
        },
      }

      parameters.body = requestBody
    }

    if (schema.responses) {
      for (const [key, value] of Object.entries(schema.responses)) {
        let responseSchema: object = (value.schema as object) || {}

        if (!isAnyZodType(responseSchema)) {
          responseSchema = legacyTypeIntoZod(responseSchema)
        }

        const contentType = value.contentType || 'application/json'

        // @ts-ignore
        responses[key] = {
          description: value.description,
          content: {
            [contentType]: {
              schema: responseSchema,
            },
          },
        }
      }
    }

    if (schema.parameters) {
      let values = schema.parameters
      const _params: any = {}

      // Convert parameter array into object
      if (Array.isArray(values)) {
        values = values.reduce(
          // @ts-ignore
          (obj, item) => Object.assign(obj, { [item.name]: item }),
          {}
        )
      }

      for (const [key, value] of Object.entries(values as Record<any, any>)) {
        if (!_params[value.location]) {
          _params[value.location] = {}
        }

        _params[value.location][key] = value.type
      }

      for (const [key, value] of Object.entries(_params)) {
        _params[key] = z.object(value as any)
      }

      parameters = {
        ...parameters,
        ..._params,
      }
    }

    delete schema.requestBody
    delete schema.parameters
    delete schema.responses

    // Deep copy
    //@ts-ignore
    return {
      ...schema,
      request: {
        ...parameters,
      },
      responses: responses,
    }
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
    const { data, errors } = await this.validateRequest(args[0])

    if (errors) {
      return this.handleValidationError(errors)
    }

    args.push(data)

    const resp = await this.handle(...args)

    if (!(resp instanceof Response) && typeof resp === 'object') {
      return jsonResp(resp)
    }

    return resp
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

    const queryParams = extractQueryParameters(request, schema.request?.query)
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

      // eslint-disable-next-line no-useless-catch
      try {
        unvalidatedData['body'] = await request.json()
      } catch (e) {
        // TODO
        throw e
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

  handle(...args: any[]): Promise<Response | Record<string, any>> {
    throw new Error('Method not implemented.')
  }
}
