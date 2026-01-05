import type { Env } from "./bindings";

export default {
  async fetch(_request: Request, _env: Env) {
    return new Response("test");
  },
};
