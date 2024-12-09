import { ApiException } from "../../exceptions";
import type { Logger, O, UpdateFilters } from "../types";
import { UpdateEndpoint } from "../update";

export class D1UpdateEndpoint<HandleArgs extends Array<object> = Array<object>> extends UpdateEndpoint<HandleArgs> {
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

  getSafeFilters(filters: UpdateFilters) {
    // Filters should only apply to primary keys
    const safeFilters = filters.filters.filter((f) => {
      return this.meta.model.primaryKeys.includes(f.field);
    });

    const conditions: string[] = [];
    const conditionsParams: string[] = [];

    for (const f of safeFilters) {
      if (f.operator === "EQ") {
        conditions.push(`${f.field} = ?${conditionsParams.length + 1}`);
        conditionsParams.push(f.value as any);
      } else {
        throw new ApiException(`operator ${f.operator} Not implemented`);
      }
    }

    return { conditions, conditionsParams };
  }

  async getObject(filters: UpdateFilters): Promise<object | null> {
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

  async update(oldObj: O<typeof this.meta>, filters: UpdateFilters): Promise<O<typeof this.meta>> {
    const safeFilters = this.getSafeFilters(filters);

    let result;
    try {
      result = (
        await this.qb
          .update({
            tableName: this.meta.model.tableName,
            data: filters.updatedData,
            where: {
              conditions: safeFilters.conditions,
              params: safeFilters.conditionsParams,
            },
            returning: "*",
          })
          .execute()
      ).results[0];
    } catch (e: any) {
      if (this.logger)
        this.logger.error(`Caught exception while trying to update ${this.meta.model.tableName}: ${e.message}`);
      throw new ApiException(e.message);
    }

    if (this.logger) this.logger.log(`Successfully updated ${this.meta.model.tableName}`);

    return result;
  }
}
