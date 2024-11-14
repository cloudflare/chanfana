import { ApiException, InputValidationException } from "../../../exceptions";
import { CreateEndpoint } from "../../create";
import type { O } from "../../types";

export class QBCreateEndpoint<
	HandleArgs extends Array<object> = Array<object>,
> extends CreateEndpoint<HandleArgs> {
	qb: any; // D1QB
	logger?: any;

	async create(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
		let inserted;
		try {
			inserted = await this.qb
				.insert({
					tableName: this.meta.model.tableName,
					data: data as any,
					returning: "*",
				})
				.execute();
		} catch (e: any) {
			if (this.logger)
				this.logger.error(
					`Caught exception while trying to create ${this.meta.model.tableName}: ${e.message}`,
				);
			if (e.message.includes("UNIQUE constraint failed")) {
				if (
					e.message.includes(this.meta.model.tableName) &&
					e.message.includes(this.meta.model.primaryKeys[0])
				) {
					throw new InputValidationException(
						`An object with this ${this.meta.model.primaryKeys[0]} already exists`,
						["body", this.meta.model.primaryKeys[0]],
					);
				}
			}

			throw new ApiException(e.message);
		}

		if (this.logger)
			this.logger.log(`Successfully created ${this.meta.model.tableName}`);

		return inserted.results;
	}
}
