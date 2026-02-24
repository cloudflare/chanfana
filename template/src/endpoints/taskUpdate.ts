import { D1UpdateEndpoint } from "chanfana";
import { taskMeta } from "../models/task";

export class TaskUpdate extends D1UpdateEndpoint {
  _meta = taskMeta;
}
