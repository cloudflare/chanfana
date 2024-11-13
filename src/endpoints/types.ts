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
	object: AnyZodObject;
	primaryKeys: Array<string>;
	serializer: (obj: object) => object;
	serializerObject: AnyZodObject;
};

export type Meta = {
	model: Model;
	fields: AnyZodObject;
};

export type O<M extends Meta> = z.infer<M["model"]["object"]>;

export type ListResult<O> = {
	result: Array<O>;
};

export function M(params: {
	model: SetOptional<Model, "serializer" | "serializerObject">;
	fields?: AnyZodObject;
}): Meta {
	return {
		fields: params.fields ?? params.model.object,
		model: {
			serializer: (obj) => obj,
			serializerObject: params.model.object,
			...params.model,
		},
	};
}
