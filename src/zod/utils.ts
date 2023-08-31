import type { z, ZodObject } from 'zod'
import {
  Arr,
  Bool,
  convertParams,
  DateTime,
  Num,
  Obj,
  Str,
} from '../parameters'
import { ZodType } from 'zod'
import { ZodArray, ZodBoolean, ZodNumber, ZodString } from 'zod'

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

export function legacyTypeIntoZod(type: any, params?: any): ZodType {
  params = params || {}

  if (type === null) {
    return new Str({ required: false, ...params }) as ZodType<ZodString>
  }

  if (isAnyZodType(type)) {
    if (params) {
      return convertParams(type, params)
    }

    return type
  }

  // Legacy support
  if (type.generator === true) {
    return new type(params) as ZodType
  }

  if (type === String) {
    return new Str(params) as ZodType<ZodString>
  }

  if (typeof type === 'string') {
    return new Str({ example: type }) as ZodType<ZodString>
  }

  if (type === Number) {
    return new Num(params) as ZodType<ZodNumber>
  }

  if (typeof type === 'number') {
    return new Num({ example: type }) as ZodType<ZodNumber>
  }

  if (type === Boolean) {
    return new Bool(params) as ZodType<ZodBoolean>
  }

  if (typeof type === 'boolean') {
    return new Bool({ example: type }) as ZodType<ZodBoolean>
  }

  if (type === Date) {
    return new DateTime(params) as ZodType<ZodString>
  }

  if (Array.isArray(type)) {
    if (type.length === 0) {
      throw new Error('Arr must have a type')
    }

    return new Arr(type[0], params) as ZodType<ZodArray<any>>
  }

  if (typeof type === 'object') {
    return new Obj(type, params) as ZodType<ZodObject<any>>
  }

  throw new Error(`${type} not implemented`)
}
