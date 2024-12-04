import type { z } from "zod";
import { Arr, Bool, DateTime, Num, Obj, Str, convertParams } from "../parameters";

export function isAnyZodType(schema: object): schema is z.ZodType {
  // @ts-ignore
  return schema._def !== undefined;
}

export function isSpecificZodType(field: any, typeName: string): boolean {
  return (
    field._def.typeName === typeName ||
    field._def.innerType?._def.typeName === typeName ||
    field._def.schema?._def.innerType?._def.typeName === typeName ||
    field.unwrap?.()._def.typeName === typeName ||
    field.unwrap?.().unwrap?.()._def.typeName === typeName ||
    field._def.innerType?._def?.innerType?._def?.typeName === typeName
  );
}

export function legacyTypeIntoZod(type: any, params?: any): z.ZodType {
  params = params || {};

  if (type === null) {
    return Str({ required: false, ...params });
  }

  if (isAnyZodType(type)) {
    if (params) {
      return convertParams(type, params);
    }

    return type;
  }

  if (type === String) {
    return Str(params);
  }

  if (typeof type === "string") {
    return Str({ example: type });
  }

  if (type === Number) {
    return Num(params);
  }

  if (typeof type === "number") {
    return Num({ example: type });
  }

  if (type === Boolean) {
    return Bool(params);
  }

  if (typeof type === "boolean") {
    return Bool({ example: type });
  }

  if (type === Date) {
    return DateTime(params);
  }

  if (Array.isArray(type)) {
    if (type.length === 0) {
      throw new Error("Arr must have a type");
    }

    return Arr(type[0], params);
  }

  if (typeof type === "object") {
    return Obj(type, params);
  }

  // Legacy support
  return type(params);
}
