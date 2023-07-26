import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { OpenAPIDefinitions } from '@asteasolutions/zod-to-openapi/dist/openapi-registry'

// @ts-ignore
export class OpenAPIRegistryMerger extends OpenAPIRegistry {
  public _definitions: OpenAPIDefinitions[] = []

  merge(registry: OpenAPIRegistryMerger): void {
    for (const definition of registry._definitions) {
      this._definitions.push({ ...definition })
    }
  }
}
