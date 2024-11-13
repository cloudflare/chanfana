import { contentJson } from "../contentTypes";
import { InputValidationException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import type { Meta, O } from "./types";

export class CreateEndpoint<
	HandleArgs extends Array<object> = Array<object>,
> extends OpenAPIRoute<HandleArgs> {
	get meta(): Meta {
		throw new Error("get Meta not implemented");
	}

	defaultValues?: Record<string, () => any>; // TODO: move this into model

	getSchema() {
		const bodyParameters = this.meta.fields.omit(
			(this.params.urlParams || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
		);
		const pathParameters = this.meta.fields.pick(
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
					description: "Returns the created Object",
					...contentJson({
						success: Boolean,
						result: this.meta.model.serializerObject,
					}),
					...this.schema?.responses?.[200],
				},
				...InputValidationException.schema(),
				...this.schema?.responses,
			},
			...this.schema,
		};
	}

	async getObject(): Promise<O<typeof this.meta>> {
		const data = await this.getValidatedData();

		// @ts-ignore  TODO: check this
		const newData: any = {
			...(data.body as object),
		};

		for (const param of this.params.urlParams) {
			newData[param] = (data.params as any)[param];
		}

		if (this.defaultValues) {
			for (const [key, value] of Object.entries(this.defaultValues)) {
				if (newData[key] === undefined) {
					newData[key] = value();
				}
			}
		}

		return newData;
	}

	async before(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
		return data;
	}

	async after(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
		return data;
	}

	async create(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
		return data;
	}

	async handle(...args: HandleArgs) {
		let obj = await this.getObject();

		obj = await this.before(obj);

		obj = await this.create(obj);

		obj = await this.after(obj);

		return {
			success: true,
			result: this.meta.model.serializer(obj as object),
		};
	}
}
