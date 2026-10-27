import { z } from "zod";
import { contentJson } from "../contentTypes";
import { InputValidationException } from "../exceptions";
import { OpenAPIRoute } from "../route";
import type { AnyZodObject, OrderByDirection } from "../types";
import {
  type FilterCondition,
  type ListFilters,
  type ListResult,
  MetaGenerator,
  type MetaInput,
  metaSchemaProps,
  type O,
} from "./types";
import { keysMask } from "./utils";

export class ListEndpoint<HandleArgs extends Array<object> = Array<object>> extends OpenAPIRoute<HandleArgs> {
  // @ts-expect-error
  _meta: MetaInput;

  get meta() {
    return MetaGenerator(this._meta);
  }

  filterFields?: Array<string>;
  searchFields?: Array<string>;
  searchFieldName = "search";
  pageFieldName = "page";
  perPageFieldName = "per_page";
  orderByFieldName = "order_by";
  orderByDirectionFieldName = "order_by_direction";
  // Explicitly type orderByFields to avoid narrow never[] inference for subclasses
  orderByFields: string[] = [];
  defaultOrderBy?: string;
  /** Default sort direction when order_by is used. Defaults to "asc". */
  defaultOrderByDirection: OrderByDirection = "asc";

  get optionFields(): string[] {
    return [this.pageFieldName, this.perPageFieldName, this.orderByFieldName, this.orderByDirectionFieldName];
  }

  override getSchema() {
    const urlParams = new Set(this.params.urlParams || []);
    const filterShape = this.meta.fields.pick(
      keysMask((this.filterFields || []).filter((item) => !urlParams.has(item))),
    ).shape;
    const pathParameters = this.meta.fields.pick(keysMask(this.params.urlParams || this.meta.model.primaryKeys || []));

    const parsedQueryParameters: Record<string, z.ZodType> = {};
    for (const [key, value] of Object.entries(filterShape)) {
      parsedQueryParameters[key] = (value as z.ZodType).optional();
    }

    if (this.searchFields) {
      parsedQueryParameters[this.searchFieldName] = z
        .string()
        .optional()
        .openapi({
          description: `Search by ${this.searchFields.join(", ")}`,
        });
    }

    let queryParameters: AnyZodObject = z
      .object({
        [this.pageFieldName]: z.number().int().min(1).optional().default(1),
        [this.perPageFieldName]: z.number().int().min(1).max(100).optional().default(20),
      })
      .extend(parsedQueryParameters);

    if (this.orderByFields && this.orderByFields.length > 0) {
      const orderByFieldsTuple = this.orderByFields as [string, ...string[]];
      const defaultOrderBy =
        this.defaultOrderBy && orderByFieldsTuple.includes(this.defaultOrderBy)
          ? this.defaultOrderBy
          : orderByFieldsTuple[0];
      queryParameters = queryParameters.extend({
        [this.orderByFieldName]: z
          .enum(orderByFieldsTuple)
          .optional()
          .default(defaultOrderBy)
          .describe("Order By Column Name"),
        [this.orderByDirectionFieldName]: z
          .enum(["asc", "desc"])
          .optional()
          .default(this.defaultOrderByDirection)
          .describe("Order By Direction"),
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
          ...contentJson(
            z.object({
              success: z.boolean(),
              result: z.array(this.meta.model.serializerSchema),
            }),
          ),
          ...this.schema?.responses?.[200],
        },
        ...InputValidationException.schema(),
        ...this.schema?.responses,
      },
      ...metaSchemaProps(this._meta),
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

  override async handle(..._args: HandleArgs) {
    let filters = await this.getFilters();

    filters = await this.before(filters);

    let objs = await this.list(filters);

    objs = await this.after(objs);

    objs = {
      ...objs,
      result: objs.result.map((item) =>
        this.meta.model.serializer(item, { filters: filters.filters, options: filters.options }),
      ),
    };

    return {
      success: true,
      ...objs,
    };
  }
}
