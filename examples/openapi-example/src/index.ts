import { OpenAPIRoute, OpenAPIRouter , Query} from '../../../src'

export class ListEndpoint extends OpenAPIRoute {
  async handle(request: Request, env: any, context: any, data: any) {
    return ['cloudflare', 'workers']
  }
}

import {z} from 'zod'

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List ToDos',
    parameters: {
      limit: Query(z.coerce.number().gte(10).lte(100), {
        description: 'Number of results to return',
      }),
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const { limit } = data.query
    // ...

    return data
  }
}


const router = OpenAPIRouter()
router.get('/list/', ListEndpoint)
router.get('/list22/', ToDoFetch)

export default {
  fetch: router.handle,
}
