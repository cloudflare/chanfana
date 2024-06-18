import { legacyTypeIntoZod } from './zod/utils'

export function contentJson(schema: any) {
  return {
    content: {
      'application/json': {
        schema: legacyTypeIntoZod(schema),
      },
    },
  }
}
