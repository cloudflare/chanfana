import { z } from "zod";
import { contentJson } from "../contentTypes";
import { NotFoundException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import type { ListFilters } from "./types";
import type { FilterCondition } from "./types";

class FetchEndpoint extends OpenAPIRoute {
	model = z.object({});
	primaryKey?: Array<string>;
	serializer = (obj: object) => obj;

	getSchema() {
		//const queryParameters = this.model.omit((this.primaryKey || []).reduce((a, v) => ({ ...a, [v]: true }), {}));
		const pathParameters = this.model.pick(
			(this.primaryKey || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
		);

		return {
			request: {
				//query: queryParameters,
				params: pathParameters,
				...this.schema?.request,
			},
			responses: {
				"200": {
					description: "Returns a single object if found",
					...contentJson({
						success: Boolean,
						result: this.model,
					}),
					...this.schema?.responses?.[200],
				},
				...NotFoundException.schema(),
				...this.schema?.responses,
			},
			...this.schema,
		};
	}

	async getFilters(): Promise<ListFilters> {
		const data = await this.getValidatedData();

		const filters: Array<FilterCondition> = [];

		for (const part of [data.params, data.query]) {
			if (part) {
				for (const [key, value] of Object.entries(part)) {
					filters.push({
						field: key,
						operator: "EQ",
						value: value as string,
					});
				}
			}
		}

		return {
			filters: filters,
			options: {}, // TODO: make a new type for this
		};
	}

	async before(filters: ListFilters): Promise<ListFilters> {
		return filters;
	}

	async after(data: object): Promise<object> {
		return data;
	}

	async fetch(filters: ListFilters): Promise<object | null> {
		return null;
	}

	async handle(...args: any[]) {
		let filters = await this.getFilters();

		filters = await this.before(filters);

		let obj = await this.fetch(filters);

		if (!obj) {
			throw new NotFoundException();
		}

		obj = await this.after(obj);

		return {
			success: true,
			result: this.serializer(obj),
		};
	}
}
