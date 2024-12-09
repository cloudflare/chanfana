import { ApiException } from "../../exceptions";
import { FetchEndpoint } from "../fetch";
import type { ListFilters, Logger, O } from "../types";

export class D1FetchEndpoint<HandleArgs extends Array<object> = Array<object>> extends FetchEndpoint<HandleArgs> {
  dbName = "replace-me";
  logger?: Logger;

  getDBBinding() {
    const env = this.params.router.getBindings(this.args);
    if (env[this.dbName] === undefined) {
      throw new ApiException(`Binding "${this.dbName}" is not defined in worker`);
    }

    if (env[this.dbName].prepare === undefined) {
      throw new ApiException(`Binding "${this.dbName}" is not a D1 binding`);
    }

    return env[this.dbName];
  }

  async fetch(filters: ListFilters): Promise<O<typeof this.meta> | null> {
    const obj = await this.qb
      .fetchOne({
        tableName: this.meta.model.tableName,
        fields: "*",
        where: {
          conditions: filters.filters.map((obj) => `${obj.field} = ?`), // TODO: implement operator
          params: filters.filters.map((obj) => obj.value),
        },
      })
      .execute();

    if (!obj.results) {
      return null;
    }

    return obj.results;
  }
}
