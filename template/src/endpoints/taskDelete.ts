import { D1DeleteEndpoint } from "chanfana";
import { taskMeta } from "../models/task";

export class TaskDelete extends D1DeleteEndpoint {
  _meta = taskMeta;
}
