import { D1ReadEndpoint } from "chanfana";
import { taskMeta } from "../models/task";

export class TaskRead extends D1ReadEndpoint {
  _meta = taskMeta;
}
