import { z } from "zod";
import { Arr, Bool, convertParams, DateTime, Num, Obj, Str } from "../parameters";

export function legacyTypeIntoZod(type: any, params?: any): z.ZodType {
  params = params || {};

  if (type === null) {
    return Str({ required: false, ...params });
  }

  if (type instanceof z.ZodType) {
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
