import { type AnyZodObject, z } from "zod";
import { contentJson } from "../contentTypes";
import { Enumeration, Str } from "../parameters";
import { OpenAPIRoute } from "../route";
import type { FilterCondition, ListFilters } from "./types";

class ListEndpoint extends OpenAPIRoute {
	model = z.object({});
	primaryKey?: Array<string>;
	pathParameters?: Array<string>;
	filterFields?: Array<string>;
	searchFields?: Array<string>;
	searchFieldName = "search";
	optionFields = ["page", "per_page", "order_by", "order_by_direction"];
	serializer = (obj: object) => obj;

	getSchema() {
		const parsedQueryParameters = this.model
			.pick(
				(this.filterFields || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
			)
			.omit(
				(this.pathParameters || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
			).shape;
		const pathParameters = this.model.pick(
			(this.pathParameters || this.primaryKey || []).reduce(
				(a, v) => ({ ...a, [v]: true }),
				{},
			),
		);

		for (const [key, value] of Object.entries(parsedQueryParameters)) {
			// @ts-ignore  TODO: check this
			parsedQueryParameters[key] = (value as AnyZodObject).optional();
		}

		if (this.searchFields) {
			// @ts-ignore  TODO: check this
			parsedQueryParameters[this.searchFieldName] = z
				.string()
				.optional()
				.openapi({
					description: `Search by ${this.searchFields.join(", ")}`,
				});
		}

		const queryParameters = z
			.object({
				page: z.number().int().min(1).optional().default(1),
				per_page: z.number().int().min(1).max(100).optional().default(20),
				order_by: Str({
					description: "Order By Column Name",
					required: false,
				}),
				order_by_direction: Enumeration({
					default: "asc",
					values: ["asc", "desc"],
					description: "Order By Direction",
					required: false,
				}),
			})
			.extend(parsedQueryParameters);

		return {
			request: {
				params: pathParameters,
				query: queryParameters,
				...this.schema?.request,
			},
			responses: {
				"200": {
					description: "List objects",
					...contentJson({
						success: Boolean,
						result: [this.model],
					}),
					...this.schema?.responses?.[200],
				},
				...this.schema?.responses,
			},
			...this.schema,
		};
	}

	async getFilters(): Promise<ListFilters> {
		const data = await this.getValidatedData();

		const filters: Array<FilterCondition> = [];
		const options: Record<string, string> = {}; // TODO: fix this type

		for (const part of [data.params, data.query]) {
			if (part) {
				for (const [key, value] of Object.entries(part)) {
					if (this.searchFields && key === this.searchFieldName) {
						filters.push({
							field: key,
							operator: "LIKE",
							value: value as string,
						});
					} else if (this.optionFields.includes(key)) {
						options[key] = value as string;
					} else {
						filters.push({
							field: key,
							operator: "EQ",
							value: value as string,
						});
					}
				}
			}
		}

		return {
			options,
			filters,
		};
	}

	async before(filters: ListFilters): Promise<ListFilters> {
		return filters;
	}

	async after(data: {
		result: Array<object>;
	}): Promise<{ result: Array<object> }> {
		return data;
	}

	async list(filters: ListFilters): Promise<{ result: Array<object> }> {
		return {
			result: [],
		};
	}

	async handle(...args: any[]) {
		let filters = await this.getFilters();

		filters = await this.before(filters);

		let objs = await this.list(filters);

		objs = await this.after(objs);

		objs = {
			...objs,
			result: objs.result.map(this.serializer),
		};

		return {
			success: true,
			...objs,
		};
	}
}
