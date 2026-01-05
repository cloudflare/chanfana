import { z } from "zod";
import { contentJson } from "../contentTypes";
import { Enumeration } from "../parameters";
import { OpenAPIRoute } from "../route";
import type { AnyZodObject } from "../types";
import {
  type FilterCondition,
  type ListFilters,
  type ListResult,
  MetaGenerator,
  type MetaInput,
  type O,
} from "./types";

export class ListEndpoint<HandleArgs extends Array<object> = Array<object>> extends OpenAPIRoute<HandleArgs> {
  // @ts-expect-error
  _meta: MetaInput;

  get meta() {
    return MetaGenerator(this._meta);
  }

  filterFields?: Array<string>;
  searchFields?: Array<string>;
  searchFieldName = "search";
  optionFields = ["page", "per_page", "order_by", "order_by_direction"];
  // Explicitly type orderByFields to avoid narrow never[] inference for subclasses
  orderByFields: string[] = [];
  defaultOrderBy?: string;

  getSchema() {
    const parsedQueryParameters = this.meta.fields.pick(
      (this.filterFields || [])
        .filter((item) => !new Set(this.params.urlParams || []).has(item))
        .reduce((a, v) => ({ ...a, [v]: true }), {}),
    ).shape;
    const pathParameters = this.meta.fields.pick(
      (this.params.urlParams || this.meta.model.primaryKeys || []).reduce((a, v) => ({ ...a, [v]: true }), {}),
    );

    for (const [key, value] of Object.entries(parsedQueryParameters)) {
      // @ts-expect-error  TODO: check this
      parsedQueryParameters[key] = (value as AnyZodObject).optional();
    }

    if (this.searchFields) {
      // @ts-expect-error  TODO: check this
      parsedQueryParameters[this.searchFieldName] = z
        .string()
        .optional()
        .openapi({
          description: `Search by ${this.searchFields.join(", ")}`,
        });
    }

    let queryParameters = z
      .object({
        page: z.number().int().min(1).optional().default(1),
        per_page: z.number().int().min(1).max(100).optional().default(20),
      })
      .extend(parsedQueryParameters);

    if (this.orderByFields && this.orderByFields.length > 0) {
      queryParameters = queryParameters.extend({
        order_by: Enumeration({
          default: this.orderByFields[0],
          values: this.orderByFields,
          description: "Order By Column Name",
          required: false,
        }),
        order_by_direction: Enumeration({
          default: "asc",
          values: ["asc", "desc"],
          description: "Order By Direction",
          required: false,
        }),
      });
    }

    return {
      request: {
        params: Object.keys(pathParameters.shape).length ? pathParameters : undefined,
        query: queryParameters,
        ...this.schema?.request,
      },
      responses: {
        "200": {
          description: "List objects",
          ...contentJson({
            success: Boolean,
            result: [this.meta.model.serializerSchema],
          }),
          ...this.schema?.responses?.[200],
        },
        ...this.schema?.responses,
      },
      ...this.schema,
    };
  }

  async getFilters(): Promise<ListFilters> {
    const data = await this.getValidatedData();

    const filters: Array<FilterCondition> = [];
    const options: Record<string, string> = {}; // TODO: fix this type

    for (const part of [data.params, data.query]) {
      if (part) {
        for (const [key, value] of Object.entries(part)) {
          if (this.searchFields && key === this.searchFieldName) {
            filters.push({
              field: key,
              operator: "LIKE",
              value: value as string,
            });
          } else if (this.optionFields.includes(key)) {
            options[key] = value as string;
          } else {
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
      options,
      filters,
    };
  }

  async before(filters: ListFilters): Promise<ListFilters> {
    return filters;
  }

  async after(data: ListResult<O<typeof this._meta>>): Promise<ListResult<O<typeof this._meta>>> {
    return data;
  }

  async list(_filters: ListFilters): Promise<ListResult<O<typeof this._meta>>> {
    return {
      result: [],
    };
  }

  async handle(..._args: HandleArgs) {
    let filters = await this.getFilters();

    filters = await this.before(filters);

    let objs = await this.list(filters);

    objs = await this.after(objs);

    objs = {
      ...objs,
      result: objs.result.map(this.meta.model.serializer),
    };

    return {
      success: true,
      ...objs,
    };
  }
}
