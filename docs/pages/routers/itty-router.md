Minimal itty-router example

```ts
import { fromIttyRouter, OpenAPIRoute } from 'chanfana'
import { Router } from "itty-router";
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

  async handle(request, env, ctx) {
    const data = await this.getValidatedData<typeof this.schema>()

    return {
      id: data.params.id,
      page: data.query.page,
    }
  }
}


const router = Router();
const openapi = fromIttyRouter(app)

openapi.get('/entry/:id', GetPageNumber)
export default openapi;
```
