import { z } from "zod";
import { contentJson } from "../contentTypes";
import { InputValidationException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import { MetaGenerator, type MetaInput, metaSchemaProps, type O } from "./types";
import { keysMask } from "./utils";

export class CreateEndpoint<HandleArgs extends Array<object> = Array<object>> extends OpenAPIRoute<HandleArgs> {
  // @ts-expect-error
  _meta: MetaInput;

  get meta() {
    return MetaGenerator(this._meta);
  }

  override getSchema() {
    const bodyParameters = this.meta.fields.omit(keysMask(this.params.urlParams || []));
    const pathParameters = this.meta.fields.pick(keysMask(this.params.urlParams || []));

    return {
      request: {
        body: contentJson(bodyParameters),
        params: Object.keys(pathParameters.shape).length ? pathParameters : undefined,
        ...this.schema?.request,
      },
      responses: {
        "201": {
          description: "Returns the created Object",
          ...contentJson(
            z.object({
              success: z.boolean(),
              result: this.meta.model.serializerSchema,
            }),
          ),
          ...this.schema?.responses?.[201],
        },
        ...InputValidationException.schema(),
        ...this.schema?.responses,
      },
      ...metaSchemaProps(this._meta),
      ...this.schema,
    };
  }

  async getObject(): Promise<O<typeof this._meta>> {
    const data = await this.getValidatedData();

    const newData: Record<string, unknown> = {
      ...(data.body as object),
    };
    const params = data.params as Record<string, unknown> | undefined;

    for (const param of this.params.urlParams) {
      newData[param] = params?.[param];
    }

    return newData as O<typeof this._meta>;
  }

  async before(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
    return data;
  }

  async after(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
    return data;
  }

  async create(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
    return data;
  }

  override async handle(..._args: HandleArgs) {
    let obj = await this.getObject();

    obj = await this.before(obj);

    obj = await this.create(obj);

    obj = await this.after(obj);

    return Response.json(
      {
        success: true,
        result: this.meta.model.serializer(obj as object, { filters: [] }),
      },
      { status: 201 },
    );
  }
}
