// Compile-time only: ensures public typings stay backward compatible for common consumer patterns.
import type { Context } from "hono";
import { z } from "zod";
import {
  ApiException,
  coerceInputs,
  contentJson,
  InputValidationException,
  OpenAPIRoute,
  UnprocessableEntityException,
} from "../../src";

export class BindingsEndpoint extends OpenAPIRoute {
  async handle() {
    const db = this.params.router.getBindings(this.args).DB;
    await db.prepare("SELECT 1").run();
    const id: string = this.params.router.getUrlParams(this.args).id;
    return { id };
  }
}

export class CustomRouterEndpoint extends OpenAPIRoute {
  async handle() {
    return { custom: this.params.router.myCustomHelper() };
  }
}

export class ValidatedDataEndpoint extends OpenAPIRoute {
  override schema = {
    request: {
      body: contentJson(z.object({ name: z.string() })),
    },
  };

  async handle() {
    const data = await this.getValidatedData();
    const name: string = data.body.name;
    await this.getValidatedData<typeof this.schema>();
    const cached: string = this.validatedData.body.name;
    const validated = await this.validateRequest(new Request("http://localhost"));
    const raw = await this.getUnvalidatedData();
    return { name, cached, validatedName: validated.body.name, sent: "name" in raw.body };
  }
}

export class PlainObjectExecuteEndpoint extends OpenAPIRoute<[Context]> {
  isDisabled = false;

  async execute(...args: [Context]) {
    if (this.isDisabled) {
      return { success: false };
    }
    return super.execute(...args);
  }
}

export async function executeResult(endpoint: OpenAPIRoute<[Context]>, c: Context) {
  const resp = await endpoint.execute(c);
  return resp.status;
}

export function errorPaths() {
  const e1 = new InputValidationException("bad", ["body", "name"]);
  const e2 = new UnprocessableEntityException("bad", ["body", "name"]);
  const first: string = e1.path[0];
  const second: string = e2.path[0];
  return [first, second, new ApiException("x").message];
}

export function coerced() {
  const result = coerceInputs(new URLSearchParams("x=1"), z.object({ x: z.number() }));
  const x: number = result?.x;
  return x;
}

export const loggerCompat: import("../../src").Logger = {
  log: (msg: string) => msg,
  info: (msg: string) => msg,
  warn: (msg: string) => msg,
  error: (msg: string) => msg,
  debug: (msg: string) => msg,
  trace: (msg: string) => msg,
};
