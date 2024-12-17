import { contentJson } from "../contentTypes";
import { InputValidationException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import { MetaGenerator, type MetaInput, type O } from "./types";

export class CreateEndpoint<HandleArgs extends Array<object> = Array<object>> extends OpenAPIRoute<HandleArgs> {
  // @ts-ignore
  _meta: MetaInput;

  get meta() {
    return MetaGenerator(this._meta);
  }

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
        params: Object.keys(pathParameters.shape).length ? pathParameters : undefined,
        ...this.schema?.request,
      },
      responses: {
        "200": {
          description: "Returns the created Object",
          ...contentJson({
            success: Boolean,
            result: this.meta.model.serializerSchema,
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
