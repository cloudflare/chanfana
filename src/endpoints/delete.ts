import { z } from "zod";
import { contentJson } from "../contentTypes";
import { NotFoundException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import type { FilterCondition, Filters } from "./types";

class DeleteEndpoint extends OpenAPIRoute {
	model = z.object({});
	primaryKey?: Array<string>;
	serializer = (obj: object) => obj;

	getSchema() {
		const bodyParameters = this.model
			.pick((this.primaryKey || []).reduce((a, v) => ({ ...a, [v]: true }), {}))
			.omit(
				(this.params.urlParams || []).reduce(
					(a, v) => ({ ...a, [v]: true }),
					{},
				),
			);
		const pathParameters = this.model
			.pick((this.primaryKey || []).reduce((a, v) => ({ ...a, [v]: true }), {}))
			.pick(
				(this.params.urlParams || []).reduce(
					(a, v) => ({ ...a, [v]: true }),
					{},
				),
			);

		return {
			request: {
				body: Object.keys(bodyParameters.shape).length
					? contentJson(bodyParameters)
					: undefined,
				params: pathParameters,
				...this.schema?.request,
			},
			responses: {
				"200": {
					description: "Returns the Object if it was successfully deleted",
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

	async getFilters(): Promise<Filters> {
		const data = await this.getValidatedData();

		const filters: Array<FilterCondition> = [];

		for (const part of [data.params, data.body]) {
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
			filters,
		};
	}

	async before(oldObj: object, filters: Filters): Promise<Filters> {
		return filters;
	}

	async after(data: object): Promise<object> {
		return data;
	}

	async delete(oldObj: object, filters: Filters): Promise<object> {
		return oldObj;
	}

	async getObject(filters: Filters): Promise<object | null> {
		return null;
	}

	async handle(...args: any[]) {
		let filters = await this.getFilters();

		const oldObj = await this.getObject(filters);

		if (oldObj === null) {
			throw new NotFoundException();
		}

		filters = await this.before(oldObj, filters);

		let obj = await this.delete(oldObj, filters);

		obj = await this.after(obj);

		return {
			success: true,
			result: this.serializer(obj),
		};
	}
}
