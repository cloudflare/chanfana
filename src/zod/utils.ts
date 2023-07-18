import type { z } from 'zod'
import {
  Arr,
  Bool,
  convertParams,
  DateTime,
  Num,
  Obj,
  Str,
} from '../parameters'

export function isAnyZodType(schema: object): schema is z.ZodType {
  // @ts-ignore
  return schema._def !== undefined
}

export function isSpecificZodType(field: any, typeName: string): boolean {
  return (
    field._def.typeName === 'ZodArray' ||
    field._def.innerType?._def.typeName === 'ZodArray' ||
    field._def.schema?._def.innerType?._def.typeName === 'ZodArray'
  )
}

export function legacyTypeIntoZod(type: any, params?: any): any {
  params = params || {}

  if (isAnyZodType(type)) {
    if (params) {
      return convertParams(type, params)
    }

    return type
  }

  // Legacy support
  if (type.generator === true) {
    return new type(params)
  }

  if (type === String) {
    return new Str(params)
  }

  if (typeof type === 'string') {
    return new Str({ example: type })
  }

  if (type === Number) {
    return new Num(params)
  }

  if (typeof type === 'number') {
    return new Num({ example: type })
  }

  if (type === Boolean) {
    return new Bool(params)
  }

  if (typeof type === 'boolean') {
    return new Bool({ example: type })
  }

  if (type === Date) {
    return new DateTime(params)
  }

  if (Array.isArray(type)) {
    if (type.length === 0) {
      throw new Error('Arr must have a type')
    }

    return new Arr(type, params)
  }

  if (typeof type === 'object') {
    return new Obj(type, params)
  }

  throw new Error(`${type} not implemented`)
}
