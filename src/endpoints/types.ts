export type FilterCondition = {
	field: string;
	operator: string;
	value: string | number | boolean | null;
};

export type ListFilters = {
	filters: Array<FilterCondition>;
	options: {
		page?: number;
		per_page?: number;
		order_by?: string;
		order_by_direction?: "asc" | "desc";
	};
};

export type Filters = {
	filters: Array<FilterCondition>;
};

export type UpdateFilters = {
	filters: Array<FilterCondition>;
	updatedData: Record<string, any>;
};
