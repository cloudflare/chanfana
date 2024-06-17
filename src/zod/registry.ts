import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { type OpenAPIDefinitions } from '@asteasolutions/zod-to-openapi/dist/openapi-registry'

// @ts-ignore
export class OpenAPIRegistryMerger extends OpenAPIRegistry {
  public _definitions: OpenAPIDefinitions[] = []

  merge(registry: OpenAPIRegistryMerger): void {
    if (!registry || !registry._definitions) return

    for (const definition of registry._definitions) {
      this._definitions.push({ ...definition })
    }
  }
}
