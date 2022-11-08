import { ValidationError } from './exceptions'

export interface ParameterType {
  default?: string | number | boolean
  description?: string
  example?: string | number | boolean
  enum?: Record<string, any>
  enumCaseSensitive?: boolean
}

export interface StringParameterType extends ParameterType {
  format?: string
}

export interface ParameterLocation extends ParameterType {
  name?: string
  required?: boolean
}

export interface Response {
  description?: string
}

export class BaseParameter {
  public static isParameter = true
  public isParameter = true
  type = null
  protected params: ParameterType

  constructor(params?: ParameterType) {
    this.params = params || {}
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

    // TODO

    return value
  }

  // @ts-ignore
  getValue() {
    const result = {
      type: 'object',
      properties: {},
    }

    for (const [key, value] of Object.entries(this.fields)) {
      // TODO: remove hack
      if (value.getValue) {
        result.properties[key] = value.getValue()
      } else {
        result.properties[key] = value
      }
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
  protected declare params: StringParameterType

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
  protected declare params: StringParameterType

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
  protected declare params: StringParameterType

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

export class Enumeration {
  public isEnum = true
  public values: Record<string, any>
  public keys: any

  constructor(values: Record<string, any>) {
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
    if (Array.isArray(type) && type.length > 0) {
      return new Arr(this.getType(type[0], params), { ...params })
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

    if (type.isEnum === true) {
      return new Str({ ...params, enum: type.values })
    }

    throw new Error(`${type} not implemented`)
  }

  getValue() {
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

function removeUndefinedFields(obj: Record<string, any>): Record<string, any> {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && !Array.isArray(value)) obj[key] = removeUndefinedFields(value)

    if (value === undefined) {
      delete obj[key]
    }
  }

  return obj
}
