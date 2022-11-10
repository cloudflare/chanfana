import { OpenAPIRouteSchema, OpenAPISchema } from './types'
import { ApiException, InputValidationException } from './exceptions'
import { Request } from 'itty-router'
import { extractParameter, extractQueryParameters, getFormatedParameters, Parameter, Resp } from './parameters'

export function route(options, func) {
  func.schema = options

  return func
}

export class OpenAPIRoute implements OpenAPIRouteSchema {
  static isRoute = true
  public static schema: OpenAPISchema

  static getSchema(schema?: OpenAPISchema): Record<any, any> {
    schema = schema ? schema : this.schema

    const responses = {}
    if (schema.responses) {
      Object.entries(schema.responses).forEach(function ([key, value]) {
        responses[key] = new Resp(null, value.schema, {
          description: value.description,
        }).getValue()
      })
    }

    // Deep copy
    return {
      ...schema,
      parameters: schema.parameters ? getFormatedParameters(schema.parameters) : {},
      responses: responses,
    }
  }

  getSchema(schema?: OpenAPISchema): Record<any, any> {
    // @ts-ignore
    return this.__proto__.constructor.getSchema(schema)
  }

  get schema(): OpenAPISchema {
    // @ts-ignore
    return this.__proto__.constructor.schema
  }

  async execute(request, ...args) {
    const { data, errors } = this.validateRequest(request)

    if (errors.length > 0) {
      throw new InputValidationException(errors)
    }

    args['data'] = data

    return await this.handle(request, ...args)
  }

  validateRequest(request: Request): any {
    // TODO: check parameters in the static getSchema are not validated here
    const params = this.getSchema().parameters
    const queryParams = extractQueryParameters(request)

    const validatedObj = {}
    const validationErrors = []

    for (const [key, value] of Object.entries(params)) {
      // @ts-ignore
      const param: Parameter = value
      const name = param.params.name ? param.params.name : key
      const rawData = extractParameter(request, queryParams, name, param.location)

      try {
        validatedObj[name] = param.validate(rawData)
      } catch (e) {
        validationErrors.push(`${name} ${(e as ApiException).message}`)
      }
    }

    return {
      data: validatedObj,
      errors: validationErrors,
    }
  }

  handle(request, ...args): Promise<Response> {
    throw new Error('Method not implemented.')
  }
}
