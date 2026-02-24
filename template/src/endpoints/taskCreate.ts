import { D1CreateEndpoint } from "chanfana";
import { taskMeta } from "../models/task";

export class TaskCreate extends D1CreateEndpoint {
  _meta = taskMeta;
}
