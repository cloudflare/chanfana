import { OpenAPIRouteSchema, OpenAPISchema, RouteValidated } from './types'
import { ApiException } from './exceptions'
import { Body, extractParameter, extractQueryParameters, getFormatedParameters, Parameter, Resp } from './parameters'

export class OpenAPIRoute implements OpenAPIRouteSchema {
  static isRoute = true

  static schema: OpenAPISchema

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

    let requestBody = null
    if (schema.requestBody) {
      requestBody = new Body(schema.requestBody, {
        contentType: schema.requestBody.contentType,
      }).getValue()
    }

    const responses: Record<string, any> = {}
    if (schema.responses) {
      for (const [key, value] of Object.entries(schema.responses)) {
        const resp = new Resp(value.schema, {
          description: value.description,
          contentType: value.contentType,
        })
        responses[key] = resp.getValue()
      }
    }

    // Deep copy
    return {
      ...schema,
      parameters: schema.parameters ? getFormatedParameters(schema.parameters) : [],
      responses: responses,
      ...(requestBody ? { requestBody: requestBody } : {}),
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

  async execute(...args: any[]) {
    const { data, errors } = await this.validateRequest(args[0])

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

  async validateRequest(request: Request): Promise<RouteValidated> {
    const params = this.getSchema().parameters || {}
    const requestBody = this.getSchema().requestBody
    const queryParams = extractQueryParameters(request)

    const validatedObj: Record<string, any> = {}
    const validationErrors: Record<string, any> = {}

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

    if (request.method.toLowerCase() !== 'get' && requestBody) {
      let json
      let loaded = false

      try {
        // @ts-ignore
        json = await request.json()
        loaded = true
      } catch (e) {
        validationErrors['body'] = (e as ApiException).message
      }

      if (loaded)
        try {
          validatedObj['body'] = new Body(requestBody).validate(json)
        } catch (e) {
          validationErrors['body' + (e as ApiException).key] = (e as ApiException).message
        }
    }

    return {
      data: validatedObj,
      errors: validationErrors,
    }
  }

  handle(...args: any[]): Promise<Response | Record<string, any>> {
    throw new Error('Method not implemented.')
  }
}
