import { contentJson } from "../contentTypes";
import { InputValidationException, NotFoundException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import {
  type FilterCondition,
  type Filters,
  MetaGenerator,
  type MetaInput,
  type O,
  type UpdatedData,
  type UpdateFilters,
} from "./types";

export class UpdateEndpoint<HandleArgs extends Array<object> = Array<object>> extends OpenAPIRoute<HandleArgs> {
  // @ts-expect-error
  _meta: MetaInput;

  get meta() {
    return MetaGenerator(this._meta);
  }

  getSchema() {
    const bodyParameters = this.meta.fields.omit(
      (this.params.urlParams || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
    );
    const pathParameters = this.meta.model.schema.pick(
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
          description: "Returns the updated Object",
          ...contentJson({
            success: Boolean,
            result: this.meta.model.serializerSchema,
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

  async getFilters(): Promise<Filters> {
    const data = await this.getValidatedData();

    const filters: Array<FilterCondition> = [];

    for (const part of [data.params, data.body]) {
      if (part) {
        for (const [key, value] of Object.entries(part)) {
          if ((this.meta.model.primaryKeys || []).includes(key)) {
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
      filters,
    };
  }

  async getUpdatedData(_oldObj: O<typeof this._meta>): Promise<UpdatedData> {
    const data = await this.getValidatedData();

    const updatedData = _oldObj;

    // In Zod 4, optional fields with defaults are always present in validated data,
    // even if not sent in the request. We need to check the raw unvalidated data to determine
    // which fields were actually provided vs which were added by Zod defaults.
    const rawData = await this.getUnvalidatedData();

    for (const part of [data.params, data.body]) {
      if (part) {
        // Get corresponding raw part to check which fields were actually sent
        const rawPart = part === data.params ? rawData.params : rawData.body;

        for (const [key, value] of Object.entries(part)) {
          if (!(this.meta.model.primaryKeys || []).includes(key)) {
            // Only update if field was present in the raw request
            // This prevents Zod 4 defaults from overwriting existing values
            if (rawPart && key in rawPart) {
              updatedData[key] = value as string;
            }
          }
        }
      }
    }

    return {
      updatedData,
    };
  }

  async before(_oldObj: O<typeof this._meta>, filters: UpdateFilters): Promise<UpdateFilters> {
    return filters;
  }

  async after<T = O<typeof this._meta>>(data: T): Promise<T> {
    return data;
  }

  async getObject(_filters: Filters): Promise<O<typeof this._meta> | null> {
    return null;
  }

  async update(oldObj: O<typeof this._meta>, _filters: UpdateFilters): Promise<O<typeof this._meta>> {
    return oldObj;
  }

  async handle(..._args: HandleArgs) {
    const initialFilters = await this.getFilters();

    const oldObj = await this.getObject(initialFilters);

    if (oldObj === null) {
      throw new NotFoundException();
    }

    const updatedData = await this.getUpdatedData(oldObj);

    const filters = await this.before(oldObj, {
      filters: initialFilters.filters,
      updatedData: updatedData.updatedData,
    });

    let obj = await this.update(oldObj, filters);

    obj = await this.after(obj);

    return {
      success: true,
      result: this.meta.model.serializer(obj),
    };
  }
}
