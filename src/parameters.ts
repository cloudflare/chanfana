import { ValidationError } from './exceptions'
import {
  EnumerationParameterType,
  ParameterBody,
  ParameterLocation,
  ParameterType,
  RegexParameterType,
  StringParameterType,
} from './types'
import { Request } from 'itty-router'

export class BaseParameter {
  public static isParameter = true
  public isParameter = true
  type = 'string'
  public params: ParameterType
  public generated: boolean

  constructor(params?: ParameterType) {
    this.params = params || {}
    this.generated = true

    if (this.params.required === undefined) this.params.required = true
  }

  getValue() {
    const value: Record<string, any> = {
      type: this.type,
      description: this.params.description,
      example: this.params.example,
      default: this.params.default,
    }

    if (this.params.deprecated) value.deprecated = this.params.deprecated

    return value
  }

  validate(value: any): any {
    return value
  }
}

export class Arr extends BaseParameter {
  public isArr = true
  private innerType

  constructor(innerType: any, params?: ParameterType) {
    super(params)
    this.innerType = innerType
  }

  validate(value: any): any {
    value = super.validate(value)

    if (this.params.required === false && (value === null || value === '')) {
      return null
    }

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
        if (value[key] === undefined || value[key] === null) {
          if (param.params.required) {
            throw new ValidationError('is required')
          }
        } else {
          value[key] = param.validate(value[key])
        }
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
    const result: Record<string, any> = {
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
      result.required = required
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

    if (typeof value !== 'string') {
      value = value.toString()
    }

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
    return {
      ...super.getValue(),
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

export class Regex extends Str {
  type = 'string'
  public declare params: RegexParameterType

  constructor(params: RegexParameterType) {
    super(params)
  }

  validate(value: any): any {
    value = super.validate(value)

    if (!value.match(this.params.pattern)) {
      if (this.params.patternError) {
        throw new ValidationError(`is not a valid ${this.params.patternError}`)
      }
      throw new ValidationError(`does not match the pattern ${this.params.format}`)
    }

    return value
  }

  getValue() {
    return {
      ...super.getValue(),
      pattern: this.params.pattern,
    }
  }
}

export class Email extends Regex {
  type = 'string'
  public declare params: RegexParameterType

  constructor(params?: StringParameterType) {
    super({
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      patternError: 'email',
      ...params,
      format: 'email',
    })
  }
}

export class Uuid extends Regex {
  type = 'string'
  public declare params: RegexParameterType

  constructor(params?: StringParameterType) {
    super({
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      patternError: 'uuid',
      ...params,
      format: 'uuid',
    })
  }
}

export class Hostname extends Regex {
  type = 'string'
  public declare params: RegexParameterType

  constructor(params?: StringParameterType) {
    super({
      pattern:
        '^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$',
      patternError: 'hostname',
      ...params,
      format: 'hostname',
    })
  }
}

export class Ipv4 extends Regex {
  type = 'string'
  public declare params: RegexParameterType

  constructor(params?: StringParameterType) {
    super({
      pattern: '^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$',
      patternError: 'ipv4',
      ...params,
      format: 'ipv4',
    })
  }
}

export class Ipv6 extends Regex {
  type = 'string'
  public declare params: RegexParameterType

  constructor(params?: StringParameterType) {
    super({
      pattern:
        '^(?:(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$',
      patternError: 'ipv6',
      ...params,
      format: 'ipv6',
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

export class Bool extends Str {
  type = 'boolean'
  private validValues = ['true', 'false']

  validate(value: any): any {
    value = super.validate(value)

    value = value.toLowerCase()

    if (!this.validValues.includes(value)) {
      throw new ValidationError('is not a valid boolean, allowed values are true or false')
    }

    value = value === 'true'

    return value
  }
}

export class Enumeration extends Str {
  public isEnum = true
  public declare params: EnumerationParameterType
  public values: Record<string, any>
  public keys: any

  constructor(params: EnumerationParameterType) {
    super(params)

    let { values } = params
    if (Array.isArray(values)) values = Object.fromEntries(values.map((x) => [x, x]))
    this.keys = Object.keys(values)
    this.values = values
  }

  validate(value: any): any {
    value = super.validate(value)

    if (this.params.enumCaseSensitive !== false) {
      value = this.params.values[value]
    } else {
      const key = this.keys.find((key: any) => key.toLowerCase() === value.toLowerCase())
      value = this.params.values[key]
    }

    if (value === undefined) {
      if (this.params.required === true) {
        throw new ValidationError('is not one of available options')
      }

      // Parameter not required neither one of the available options
      return null
    }

    return value
  }

  getValue() {
    return {
      ...super.getValue(),
      enum: this.keys,
    }
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

  getType(type: any, params: ParameterLocation): any {
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
      const parsed: Record<string, any> = {}
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
    // @ts-ignore
    super(null, rawType, {})
    // @ts-ignore
    this.paramsBody = params
  }

  getValue(): Record<string, any> {
    const schema = removeUndefinedFields(this.type.getValue())

    const param: Record<string, any> = {
      description: this.paramsBody?.description,
      content: {},
    }

    param.content[this.paramsBody?.contentType || 'application/json'] = { schema: schema }

    return param
  }
}

export class Resp extends Parameter {
  constructor(rawType: any, params: ParameterLocation) {
    // @ts-ignore
    super(null, rawType, params)
  }

  // @ts-ignore
  getValue() {
    const value = super.getValue()
    const contentType = this.params?.contentType ? 'this.params?.contentType' : 'application/json'

    const param: Record<string, any> = {
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

export function extractParameter(request: Request, query: Record<string, any>, name: string, location: string): any {
  if (location === 'query') {
    return query[name]
  }
  if (location === 'path') {
    // @ts-ignore
    return request.params[name]
  }
  if (location === 'header') {
    // @ts-ignore
    return request.headers.get(name)
  }
  if (location === 'cookie') {
    throw new Error('Cookie parameters not implemented yet')
  }
}

export function extractQueryParameters(request: Request): Record<string, any> {
  const url = decodeURIComponent(request.url).split('?')

  if (url.length === 1) {
    return {}
  }

  const query = url[1]

  const params: Record<string, any> = {}
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
