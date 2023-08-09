import { OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ListEndpoint extends OpenAPIRoute {
  static schema = {

  }

  async handle(request: Request, env: any, context: any, data: object) {
    return ['cloudflare', 'workers']
  }
}


import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()
router.get('/list/', ListEndpoint)

export default {
  fetch: router.handle,
}
