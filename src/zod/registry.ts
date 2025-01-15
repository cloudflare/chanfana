import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

// @ts-ignore
export class OpenAPIRegistryMerger extends OpenAPIRegistry {
  public _definitions: { route: { path: string } }[] = [];

  merge(registry: OpenAPIRegistryMerger, basePath?: string): void {
    if (!registry || !registry._definitions) return;

    for (const definition of registry._definitions) {
      if (basePath) {
        this._definitions.push({
          ...definition,
          route: {
            ...definition.route,
            path: `${basePath}${definition.route.path}`,
          },
        });
      } else {
        this._definitions.push({ ...definition });
      }
    }
  }
}
