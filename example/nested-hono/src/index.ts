import { Hono } from 'hono'
import { fromHono, OpenAPIRoute } from 'chanfana'
import { z } from 'zod'

const app = new Hono()
const openAPI = fromHono(app)

export class GetPostcode extends OpenAPIRoute {
  schema = {
    summary: 'Postcode endpoint.',
    request: {
      params: z.object({
        foo: z.string().min(6).max(6),
        bar: z.string().min(1).max(10),
      }),
    },
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: z.object({
              postcode: z.string(),
            }),
          },
        },
      },
    },
  }

  async handle(c) {
    return c.json({})
  }
}

openAPI.get('/example', GetPostcode)

export default app
