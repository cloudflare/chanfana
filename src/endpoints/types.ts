import type { z } from "zod";
import type { AnyZodObject, OrderByDirection, SetRequired } from "../types";

export type FilterCondition = {
  field: string;
  operator: string;
  value: string | number | boolean | null;
};

export type ListFilters = {
  filters: Array<FilterCondition>;
  options: {
    page?: number;
    per_page?: number;
    order_by?: string;
    order_by_direction?: OrderByDirection;
    [key: string]: unknown;
  };
};

export type Filters = {
  filters: Array<FilterCondition>;
};

export type UpdateFilters = {
  filters: Array<FilterCondition>;
  updatedData: Record<string, any>;
};

export type UpdatedData = {
  updatedData: Record<string, any>;
};

export type SerializerContext = {
  filters?: Array<FilterCondition>;
  options?: {
    page?: number;
    per_page?: number;
    order_by?: string;
    order_by_direction?: OrderByDirection;
    [key: string]: unknown;
  };
};

export type Model = {
  tableName: string;
  schema: AnyZodObject;
  primaryKeys: Array<string>;
  serializer?: (obj: object, context?: SerializerContext) => object;
  serializerSchema?: AnyZodObject;
};

export type ModelComplete = SetRequired<Model, "serializer" | "serializerSchema">;

export type MetaInput = {
  model: Model;
  fields?: AnyZodObject;
  pathParameters?: Array<string>;
  tags?: Array<string>;
};

export type Meta = {
  model: ModelComplete;
  fields: AnyZodObject;
  tags?: Array<string>;
};

export type O<M extends MetaInput> = z.infer<M["model"]["schema"]>;

export type ListResult<O> = {
  result: Array<O>;
};

export function MetaGenerator(meta: MetaInput) {
  return {
    fields: meta.fields ?? meta.model.schema,
    model: {
      serializer: (obj: any, _context?: SerializerContext): any => obj,
      serializerSchema: meta.model.schema,
      ...meta.model,
    },
    pathParameters: meta.pathParameters ?? null,
    tags: meta.tags,
  };
}

export function metaSchemaProps(meta: MetaInput): Record<string, unknown> {
  return {
    ...(meta.tags?.length ? { tags: meta.tags } : {}),
  };
}

export type Logger = {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  trace: (...args: any[]) => void;
};
