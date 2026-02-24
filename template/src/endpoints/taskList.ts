import { D1ListEndpoint } from "chanfana";
import { taskMeta } from "../models/task";

export class TaskList extends D1ListEndpoint {
  _meta = taskMeta;

  /** Fields that can be filtered via query params (e.g., ?completed=true) */
  filterFields = ["completed"];

  /** Fields searched when the `search` query param is provided */
  searchFields = ["title", "description"];

  /** Fields that can be used for ordering (e.g., ?order_by=created_at) */
  orderByFields = ["id", "title", "created_at"];

  /** Default column to order by when no order_by param is given */
  defaultOrderBy = "id";
}
