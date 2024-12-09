import { ApiException } from "../../exceptions";
import { DeleteEndpoint } from "../delete";
import type { Filters, Logger, O } from "../types";

export class D1DeleteEndpoint<HandleArgs extends Array<object> = Array<object>> extends DeleteEndpoint<HandleArgs> {
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

  getSafeFilters(filters: Filters) {
    const conditions: string[] = [];
    const conditionsParams: string[] = [];

    for (const f of filters.filters) {
      if (f.operator === "EQ") {
        conditions.push(`${f.field} = ?${conditionsParams.length + 1}`);
        conditionsParams.push(f.value as any);
      } else {
        throw new ApiException(`operator ${f.operator} Not implemented`);
      }
    }

    return { conditions, conditionsParams };
  }

  async getObject(filters: Filters): Promise<O<typeof this.meta> | null> {
    const safeFilters = this.getSafeFilters(filters);
    const oldObj = await this.qb
      .fetchOne({
        tableName: this.meta.model.tableName,
        fields: "*",
        where: {
          conditions: safeFilters.conditions,
          params: safeFilters.conditionsParams,
        },
      })
      .execute();

    if (!oldObj.results) {
      return null;
    }

    return oldObj.results;
  }

  async delete(oldObj: O<typeof this.meta>, filters: Filters): Promise<O<typeof this.meta> | null> {
    const safeFilters = this.getSafeFilters(filters);

    let result;
    try {
      result = await this.qb
        .delete({
          tableName: this.meta.model.tableName,
          where: {
            conditions: safeFilters.conditions,
            params: safeFilters.conditionsParams,
          },
          returning: "*",
        })
        .execute();
    } catch (e: any) {
      if (this.logger)
        this.logger.error(`Caught exception while trying to delete ${this.meta.model.tableName}: ${e.message}`);
      throw new ApiException(e.message);
    }

    if (result.changes === 0) {
      return null;
    }

    if (this.logger) this.logger.log(`Successfully deleted ${this.meta.model.tableName}`);

    return oldObj;
  }
}
