Minimal Hono example

```ts
import { fromHono, OpenAPIRoute } from '@cloudflare/itty-router-openapi'
import { Hono } from 'hono'
import { z } from 'zod'

export class GetPageNumber extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({
        id: z.string().min(2).max(10),
      }),
      query: z.object({
        page: z.number().int().min(0).max(20),
      }),
    },
  }

  async handle(c) {
    const data = await this.getValidatedData<typeof this.schema>()

    return c.json({
      id: data.params.id,
      page: data.query.page,
    })
  }
}


const app = new Hono()
const openapi = fromHono(app)

openapi.get('/entry/:id', GetPageNumber)
export default app
```
