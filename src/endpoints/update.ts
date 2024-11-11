import { z } from "zod";
import { contentJson } from "../contentTypes";
import { NotFoundException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import type { FilterCondition, UpdateFilters } from "./types";

export class UpdateEndpoint extends OpenAPIRoute {
	model = z.object({});
	primaryKey?: Array<string>;
	pathParameters?: Array<string>;
	serializer = (obj: object) => obj;

	getSchema() {
		const bodyParameters = this.model.omit(
			(this.pathParameters || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
		);
		const pathParameters = this.model.pick(
			(this.pathParameters || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
		);

		return {
			request: {
				body: contentJson(bodyParameters),
				params: pathParameters,
				...this.schema?.request,
			},
			responses: {
				"200": {
					description: "Returns the updated Object",
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

	async getFilters(): Promise<UpdateFilters> {
		const data = await this.getValidatedData();

		const filters: Array<FilterCondition> = [];
		const updatedData: Record<string, string> = {}; // TODO: fix this type

		for (const part of [data.params, data.body]) {
			if (part) {
				for (const [key, value] of Object.entries(part)) {
					if ((this.primaryKey || []).includes(key)) {
						filters.push({
							field: key,
							operator: "EQ",
							value: value as string,
						});
					} else {
						updatedData[key] = value as string;
					}
				}
			}
		}

		return {
			filters,
			updatedData,
		};
	}

	async before(oldObj: object, filters: UpdateFilters): Promise<UpdateFilters> {
		return filters;
	}

	async after(data: object): Promise<object> {
		return data;
	}

	async getObject(filters: UpdateFilters): Promise<object | null> {
		return null;
	}

	async update(oldObj: object, filters: UpdateFilters): Promise<object> {
		return oldObj;
	}

	async handle(...args: any[]) {
		let filters = await this.getFilters();

		const oldObj = await this.getObject(filters);

		if (oldObj === null) {
			throw new NotFoundException();
		}

		filters = await this.before(oldObj, filters);

		let obj = await this.update(oldObj, filters);

		obj = await this.after(obj);

		return {
			success: true,
			result: this.serializer(obj),
		};
	}
}
