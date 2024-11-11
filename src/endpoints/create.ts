import { z } from "zod";
import { contentJson } from "../contentTypes";
import { InputValidationException } from "../exceptions";
import { OpenAPIRoute } from "../route";

class CreateEndpoint extends OpenAPIRoute {
	model = z.object({});
	pathParameters?: Array<string>;
	defaultValues?: Record<string, () => any>;
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
					description: "Returns the created Object",
					...contentJson({
						success: Boolean,
						result: this.model,
					}),
					...this.schema?.responses?.[200],
				},
				...InputValidationException.schema(),
				...this.schema?.responses,
			},
			...this.schema,
		};
	}

	async getObject(): Promise<object> {
		const data = await this.getValidatedData();

		// @ts-ignore  TODO: check this
		const newData: any = {
			...(data.body as object),
		};

		if (this.pathParameters) {
			for (const param of this.pathParameters) {
				newData[param] = (data.params as any)[param];
			}
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

	async before(data: object): Promise<object> {
		return data;
	}

	async after(data: object): Promise<object> {
		return data;
	}

	async create(data: object): Promise<object> {
		return data;
	}

	async handle(...args: any[]) {
		let obj = await this.getObject();

		obj = await this.before(obj);

		obj = await this.create(obj);

		obj = await this.after(obj);

		return {
			success: true,
			result: this.serializer(obj),
		};
	}
}
