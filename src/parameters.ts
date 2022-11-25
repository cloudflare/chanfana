import { ValidationError } from './exceptions'
import { ParameterBody, ParameterLocation, ParameterType, StringParameterType } from './types'

export class BaseParameter {
  public static isParameter = true
  public isParameter = true
  type = null
  public params: ParameterType
  public generated: boolean

  constructor(params?: ParameterType) {
    this.params = params || {}
    this.generated = true

    if (this.params.required === undefined) this.params.required = true
  }

  getValue() {
    return {
      type: this.type,
      description: this.params.description,
      example: this.params.example,
      default: this.params.default,
      enum: this.params.enum ? Object.keys(this.params.enum) : undefined,
    }
  }

  validate(value: any): any {
    if (this.params.enum) {
      if (typeof value !== 'string') {
        throw new ValidationError('is not one of available options')
      }

      if (this.params.enumCaseSensitive !== false) {
        value = this.params.enum[value]
      } else {
        const key = Object.keys(this.params.enum).find((key) => key.toLowerCase() === value.toLowerCase())
        value = this.params.enum[key]
      }

      if (value === undefined) {
        throw new ValidationError('is not one of available options')
      }
    }

    return value
  }
}

export class Arr extends BaseParameter {
  public isArr = true
  private innerType

  constructor(innerType, params?: ParameterType) {
    super(params)
    this.innerType = innerType
  }

  validate(value: any): any {
    value = super.validate(value)

    if (Array.isArray(value)) {
      value = value.map((val) => {
        return this.innerType.validate(val)
      })
    } else {
      value = [this.innerType.validate(value)]
    }

    return value
  }

  // @ts-ignore
  getValue() {
    return {
      type: 'array',
      items: this.innerType.getValue(),
    }
  }
}

export class Obj extends BaseParameter {
  public isObj = true

  private fields: Record<string, BaseParameter>

  constructor(fields: Record<string, BaseParameter>, params?: ParameterType) {
    super(params) // TODO: fix obj params
    this.fields = fields
  }

  validate(value: any): any {
    value = super.validate(value)

    for (const [key, param] of Object.entries(this.fields)) {
      try {
        value[key] = param.validate(value[key])
      } catch (e) {
        // @ts-ignore
        e.key = (e.key || '') + `.${key}`

        throw e
      }
    }

    return value
  }

  // @ts-ignore
  getValue() {
    const result = {
      type: 'object',
      properties: {},
    }
    const required = []

    for (const [key, value] of Object.entries(this.fields)) {
      if (value.params?.required === true) {
        required.push(key)
      }

      if (value.getValue) {
        result.properties[key] = value.getValue()
      } else {
        result.properties[key] = value
      }
    }

    if (required.length > 0) {
      result['required'] = required
    }

    return result
  }
}

export class Num extends BaseParameter {
  type = 'number'

  validate(value: any): any {
    value = super.validate(value)

    value = Number.parseFloat(value)

    if (isNaN(value)) {
      throw new ValidationError('is not a valid number')
    }

    return value
  }
}

export class Int extends Num {
  type = 'integer'

  validate(value: any): any {
    value = super.validate(value)

    value = Number.parseInt(value)

    if (isNaN(value)) {
      throw new ValidationError('is not a valid integer')
    }

    return value
  }
}

export class Str extends BaseParameter {
  type = 'string'
  public declare params: StringParameterType

  constructor(params?: StringParameterType) {
    super(params)
  }

  validate(value: any): any {
    value = super.validate(value)

    if (this.params.format) {
      if (this.params.format === 'date-time') {
        value = new Date(value)

        if (isNaN(value.getDay())) {
          throw new ValidationError('is not a valid date time')
        }
      } else if (this.params.format === 'date') {
        if (!value.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
          throw new ValidationError('is not a valid date')
        }

        value = new Date(value)

        if (isNaN(value.getDay())) {
          throw new ValidationError('is not a valid date')
        }
      }
      // TODO: validate remaining formats
    }

    return value
  }

  getValue() {
    const value = super.getValue()

    return {
      ...value,
      format: this.params.format,
    }
  }
}

export class DateTime extends Str {
  type = 'string'
  public declare params: StringParameterType

  constructor(params?: StringParameterType) {
    super({
      example: '2022-09-15T00:00:00Z',
      ...params,
      format: 'date-time',
    })
  }
}

export class DateOnly extends Str {
  type = 'string'
  public declare params: StringParameterType

  constructor(params?: StringParameterType) {
    super({
      example: '2022-09-15',
      ...params,
      format: 'date',
    })
  }
}

export class Bool extends BaseParameter {
  type = 'boolean'
  private validValues = ['true', 'false']

  validate(value: any): any {
    value = super.validate(value)

    value = value.toLowerCase()

    if (!this.validValues.includes(value)) {
      throw new ValidationError('is not a valid boolean, allowed values true or false')
    }

    value = value === 'true'

    return value
  }
}

export class Enumeration extends Str {
  public isEnum = true
  public values: Record<string, any>
  public keys: any

  constructor(values: Record<string, any>, params?: StringParameterType) {
    super({ ...(params || {}), enum: values })
    this.keys = Object.keys(values)
    this.values = values
  }
}

export class Parameter {
  public location: string
  private rawType: any
  public type: BaseParameter
  public params: ParameterLocation

  constructor(location: string, rawType: any, params: ParameterLocation) {
    this.location = location
    this.rawType = rawType

    if (params.required === undefined) params.required = true
    this.params = params

    this.type = this.getType(rawType, params)
  }

  getType(type: any, params: ParameterLocation) {
    if (type.generated === true) {
      return type
    }

    if (type.isParameter === true) {
      // @ts-ignore
      return new type({ ...params })
    }

    if (type === String) {
      return new Str({ ...params })
    }

    if (type === Number) {
      return new Num({ ...params })
    }

    if (type === Boolean) {
      return new Bool({ ...params })
    }

    if (type === Date) {
      return new DateTime()
    }

    if (Array.isArray(type)) {
      if (type.length === 0) {
        throw new Error('Arr must have a type')
      }

      return new Arr(this.getType(type[0], params), { ...params })
    }

    if (typeof type === 'object') {
      const parsed = {}
      for (const [key, value] of Object.entries(type)) {
        parsed[key] = this.getType(value, {})
      }

      return new Obj(parsed, params)
    }

    throw new Error(`${type} not implemented`)
  }

  getValue(): Record<string, any> {
    const schema = removeUndefinedFields(this.type.getValue())

    return {
      description: this.params.description,
      required: this.params.required,
      schema: schema,
      name: this.params.name,
      in: this.location,
    }
  }

  validate(value: any): any {
    if (value === undefined || value === null) {
      if (this.params.default !== undefined && this.params.default !== null) {
        value = this.params.default
      } else {
        if (this.params.required) {
          throw new ValidationError('is required')
        } else {
          return null
        }
      }
    }

    value = this.type.validate(value)

    return value
  }
}

export class Body extends Parameter {
  paramsBody: ParameterBody

  constructor(rawType: any, params?: ParameterBody) {
    super(null, rawType, {})
    this.paramsBody = params
  }

  getValue(): Record<string, any> {
    const schema = removeUndefinedFields(this.type.getValue())

    const param = {
      description: this.paramsBody?.description,
      content: {},
    }

    param.content[this.paramsBody?.contentType || 'application/json'] = { schema: schema }

    return param
  }
}

export class Resp extends Parameter {
  constructor(rawType: any, params: ParameterLocation) {
    super(null, rawType, params)
  }

  // @ts-ignore
  getValue() {
    const value = super.getValue()
    const contentType = this.params?.contentType ? 'this.params?.contentType' : 'application/json'

    const param = {
      description: this.params.description || 'Successful Response',
      content: {},
    }

    param.content[contentType] = { schema: value.schema }
    return param
  }
}

export function Query(type: any, params: ParameterLocation = {}): Parameter {
  return new Parameter('query', type, params)
}

export function Path(type: any, params: ParameterLocation = {}): Parameter {
  return new Parameter('path', type, params)
}

export function Header(type: any, params: ParameterLocation = {}): Parameter {
  return new Parameter('header', type, params)
}

export function Cookie(type: any, params: ParameterLocation = {}): Parameter {
  return new Parameter('cookie', type, params)
}

export function extractParameter(request, query: Record<string, any>, name: string, location: string): any {
  if (location === 'query') {
    return query[name]
  }
  if (location === 'path') {
    return request.params[name]
  }
  if (location === 'header') {
    return request.headers.get(name)
  }
  if (location === 'cookie') {
    throw new Error('Cookie parameters not implemented yet')
  }
}

export function extractQueryParameters(request): Record<string, any> {
  const url = decodeURIComponent(request.url).split('?')

  if (url.length === 1) {
    return {}
  }

  const query = url[1]

  const params = {}
  for (const param of query.split('&')) {
    const paramSplitted = param.split('=')
    const key = paramSplitted[0]
    const value = paramSplitted[1]

    if (params[key] === undefined) {
      params[key] = value
    } else if (!Array.isArray(params[key])) {
      params[key] = [params[key], value]
    } else {
      params[key].push(value)
    }
  }

  return params
}

export function Required(param: Parameter): Parameter {
  param.params.required = true

  return param
}

export function removeUndefinedFields(obj: Record<string, any>): Record<string, any> {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && !Array.isArray(value)) obj[key] = removeUndefinedFields(value)

    if (value === undefined) {
      delete obj[key]
    }
  }

  return obj
}

export function getFormatedParameters(params: Record<string, Parameter> | Parameter[]) {
  const formated = []
  const isArray = Array.isArray(params)

  for (const [key, parameter] of Object.entries(params || {})) {
    if (isArray && !parameter.params.name) {
      throw new Error('Parameter must have a defined name when using as Array')
    }

    const name = parameter.params.name ? parameter.params.name : key

    formated.push({
      // TODO: check this type before assign
      // @ts-ignore
      ...parameter.getValue(),
      name: name,
    })
  }

  return formated
}
