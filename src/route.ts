import { OpenAPIRouteSchema, OpenAPISchema } from './types'
import { ApiException, InputValidationException } from './exceptions'
import { Request } from 'itty-router'
import { extractParameter, extractQueryParameters, getFormatedParameters, Parameter, Resp } from './parameters'
import { resolveConfig } from 'prettier'

export function route(options, func) {
  func.schema = options

  return func
}

export class OpenAPIRoute implements OpenAPIRouteSchema {
  static isRoute = true

  static schema: OpenAPISchema = null

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

  static getParsedSchema(): Record<any, any> {
    const schema = this.getSchema()

    const responses = {}
    if (schema.responses) {
      for (const [key, value] of Object.entries(schema.responses)) {
        responses[key] = new Resp(null, value.schema, {
          description: value.description,
        }).getValue()
      }
    }

    // Deep copy
    return {
      ...schema,
      parameters: schema.parameters ? getFormatedParameters(schema.parameters) : {},
      responses: responses,
    }
  }

  jsonResp(params: { data: Record<string, any>; status?: number }): Response {
    return new Response(JSON.stringify(params.data), {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
      status: params.status || 200,
    })
  }

  handleValidationError(errors: Record<string, any>): Response {
    return this.jsonResp({
      data: {
        errors: errors,
        success: false,
        result: {},
      },
      status: 400,
    })
  }

  async execute(...args) {
    const { data, errors } = this.validateRequest(args[0])

    if (Object.keys(errors).length > 0) {
      return this.handleValidationError(errors)
    }

    args.push(data)

    const resp = await this.handle(...args)

    if (!(resp instanceof Response) && typeof resp === 'object') {
      return this.jsonResp({ data: resp })
    }

    return resp
  }

  validateRequest(request: Request): any {
    const params = this.getSchema().parameters
    const queryParams = extractQueryParameters(request)

    const validatedObj = {}
    const validationErrors = {}

    for (const [key, value] of Object.entries(params)) {
      // @ts-ignore
      const param: Parameter = value
      const name = param.params.name ? param.params.name : key
      const rawData = extractParameter(request, queryParams, name, param.location)

      try {
        validatedObj[name] = param.validate(rawData)
      } catch (e) {
        validationErrors[name] = (e as ApiException).message
      }
    }

    return {
      data: validatedObj,
      errors: validationErrors,
    }
  }

  handle(...args): Promise<Response | Record<string, any>> {
    throw new Error('Method not implemented.')
  }
}
