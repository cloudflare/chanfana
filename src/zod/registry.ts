import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

// @ts-expect-error
export class OpenAPIRegistryMerger extends OpenAPIRegistry {
  public override _definitions: { type?: string; route: { path: string; method?: string; operationId?: string } }[] =
    [];

  merge(registry: OpenAPIRegistryMerger, basePath?: string): void {
    if (!registry?._definitions) {
      return;
    }

    for (const definition of registry._definitions) {
      if (definition.type !== "route") {
        this._definitions.push({ ...definition });
        continue;
      }

      // A child root route ("/") is documented at the base path itself, without a trailing slash
      const childPath = definition.route.path === "/" ? "" : definition.route.path;

      // Always copy the route, so that changes in this registry (like operationId renames) don't leak into the child
      this._definitions.push({
        ...definition,
        route: {
          ...definition.route,
          path: basePath ? `${basePath}${childPath}` : definition.route.path,
        },
      });
    }
  }
}
