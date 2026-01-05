import { contentJson } from "../contentTypes";
import { NotFoundException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import { type FilterCondition, type Filters, MetaGenerator, type MetaInput, type O } from "./types";

export class DeleteEndpoint<HandleArgs extends Array<object> = Array<object>> extends OpenAPIRoute<HandleArgs> {
  // @ts-expect-error
  _meta: MetaInput;

  get meta() {
    return MetaGenerator(this._meta);
  }

  getSchema() {
    const urlParams = this.meta.pathParameters ?? this.params.urlParams ?? [];

    const bodyParameters = this.meta.fields
      .pick((this.meta.model.primaryKeys || []).reduce((a, v) => ({ ...a, [v]: true }), {}))
      .omit(urlParams.reduce((a, v) => ({ ...a, [v]: true }), {}));
    const pathParameters = this.meta.fields
      .pick((this.meta.model.primaryKeys || []).reduce((a, v) => ({ ...a, [v]: true }), {}))
      .pick(urlParams.reduce((a, v) => ({ ...a, [v]: true }), {}));

    return {
      request: {
        body: Object.keys(bodyParameters.shape).length ? contentJson(bodyParameters) : undefined,
        params: Object.keys(pathParameters.shape).length ? pathParameters : undefined,
        ...this.schema?.request,
      },
      responses: {
        "200": {
          description: "Returns the Object if it was successfully deleted",
          ...contentJson({
            success: Boolean,
            result: this.meta.model.serializerSchema,
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

  async before(_oldObj: O<typeof this._meta>, filters: Filters): Promise<Filters> {
    return filters;
  }

  async after(data: O<typeof this._meta>): Promise<O<typeof this._meta>> {
    return data;
  }

  async delete(_oldObj: O<typeof this._meta>, _filters: Filters): Promise<O<typeof this._meta> | null> {
    return null;
  }

  async getObject(_filters: Filters): Promise<O<typeof this._meta> | null> {
    return null;
  }

  async handle(..._args: HandleArgs) {
    let filters = await this.getFilters();

    const oldObj = await this.getObject(filters);

    if (oldObj === null) {
      throw new NotFoundException();
    }

    filters = await this.before(oldObj, filters);

    let obj = await this.delete(oldObj, filters);

    if (obj === null) {
      throw new NotFoundException();
    }

    obj = await this.after(obj);

    return {
      success: true,
      result: this.meta.model.serializer(obj),
    };
  }
}
