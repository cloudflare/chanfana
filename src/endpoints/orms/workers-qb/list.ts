import { ApiException } from "../../../exceptions";
import { ListEndpoint } from "../../list";
import type { ListFilters, ListResult, O } from "../../types";

export class QBListEndpoint<
	HandleArgs extends Array<object> = Array<object>,
> extends ListEndpoint<HandleArgs> {
	qb: any; // D1QB
	logger?: any;

	async list(
		filters: ListFilters,
	): Promise<ListResult<O<typeof this.meta>> & { result_info: object }> {
		const offset =
			(filters.options.per_page || 20) * (filters.options.page || 0) -
			(filters.options.per_page || 20);
		const limit = filters.options.per_page;

		const conditions: string[] = [];
		const conditionsParams: string[] = [];

		for (const f of filters.filters) {
			if (this.searchFields && f.field === this.searchFieldName) {
				const searchCondition = this.searchFields
					.map((obj) => {
						return `UPPER(${obj}) like UPPER(?${conditionsParams.length + 1})`;
					})
					.join(" or ");
				conditions.push(`(${searchCondition})`);
				conditionsParams.push(`%${f.value}%`);
			} else if (f.operator === "EQ") {
				conditions.push(`${f.field} = ?${conditionsParams.length + 1}`);
				conditionsParams.push(f.value as any);
			} else {
				throw new ApiException(`operator ${f.operator} Not implemented`);
			}
		}

		let where = null;
		if (conditions.length > 0) {
			where = {
				conditions: conditions,
				params: conditionsParams,
			};
		}

		const results = await this.qb
			.fetchAll({
				tableName: this.meta.model.tableName,
				fields: "*",
				where: where,
				limit: limit,
				offset: offset,
				orderBy: filters.options.order_by
					? {
							[filters.options.order_by]:
								filters.options.order_by_direction || "ASC",
						}
					: {
							[this.meta.model.primaryKeys[0] as string]: "ASC",
						},
			})
			.execute();

		return {
			result: results.results,
			result_info: {
				count: results.results.length,
				page: filters.options.page,
				per_page: filters.options.per_page,
				total_count: (
					await this.qb
						.fetchOne({
							tableName: this.meta.model.tableName,
							fields: "count(*) as total",
							where: where,
						})
						.execute()
				).results.total,
			},
		};
	}
}
