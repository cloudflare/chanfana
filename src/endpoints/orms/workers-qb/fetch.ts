import { FetchEndpoint } from "../../fetch";
import type { ListFilters, O } from "../../types";

export class QBFetchEndpoint<
	HandleArgs extends Array<object> = Array<object>,
> extends FetchEndpoint<HandleArgs> {
	qb: any; // D1QB
	logger?: any;

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
