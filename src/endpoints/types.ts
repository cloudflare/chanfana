import type { AnyZodObject, z } from "zod";
import type { SetOptional } from "../types";

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
    order_by_direction?: "asc" | "desc";
  };
};

export type Filters = {
  filters: Array<FilterCondition>;
};

export type UpdateFilters = {
  filters: Array<FilterCondition>;
  updatedData: Record<string, any>;
};

export type Model = {
  tableName: string;
  schema: AnyZodObject;
  primaryKeys: Array<string>;
  serializer: (obj: object) => object;
  serializerObject: AnyZodObject;
};

export type MetaInput = {
  model: SetOptional<Model, "serializer" | "serializerObject">;
  fields?: AnyZodObject;
};

export type Meta = {
  model: Model;
  fields: AnyZodObject;
};

export type O<M extends Meta> = z.infer<M["model"]["schema"]>;

export type ListResult<O> = {
  result: Array<O>;
};

export function MetaGenerator(meta: MetaInput) {
  return {
    fields: meta.fields ?? meta.model.schema,
    model: {
      serializer: (obj: object) => obj,
      serializerObject: meta.model.schema,
      ...meta.model,
    },
  };
}
