import type { Env } from "./bindings";

export default {
  async fetch(request: Request, env: Env) {
    return new Response("test");
  },
};
