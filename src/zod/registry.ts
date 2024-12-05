import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

// @ts-ignore
export class OpenAPIRegistryMerger extends OpenAPIRegistry {
  public _definitions: object[] = [];

  merge(registry: OpenAPIRegistryMerger): void {
    if (!registry || !registry._definitions) return;

    for (const definition of registry._definitions) {
      this._definitions.push({ ...definition });
    }
  }
}
