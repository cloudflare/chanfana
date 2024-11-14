import { contentJson } from "../contentTypes";
import { InputValidationException, NotFoundException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import type { FilterCondition, Meta, O, UpdateFilters } from "./types";

export class UpdateEndpoint<
	HandleArgs extends Array<object> = Array<object>,
> extends OpenAPIRoute<HandleArgs> {
	get meta(): Meta {
		throw new Error("get Meta not implemented");
	}

	getSchema() {
		const bodyParameters = this.meta.fields.omit(
			(this.params.urlParams || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
		);
		const pathParameters = this.meta.model.object.pick(
			(this.params.urlParams || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
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
						result: this.meta.model.serializerObject,
					}),
					...this.schema?.responses?.[200],
				},
				...InputValidationException.schema(),
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
					if ((this.meta.model.primaryKeys || []).includes(key)) {
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

	async before(
		oldObj: O<typeof this.meta>,
		filters: UpdateFilters,
	): Promise<UpdateFilters> {
		return filters;
	}

	async after(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
		return data;
	}

	async getObject(filters: UpdateFilters): Promise<O<typeof this.meta> | null> {
		return null;
	}

	async update(
		oldObj: O<typeof this.meta>,
		filters: UpdateFilters,
	): Promise<O<typeof this.meta>> {
		return oldObj;
	}

	async handle(...args: HandleArgs) {
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
			result: this.meta.model.serializer(obj),
		};
	}
}
