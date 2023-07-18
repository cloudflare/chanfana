import 'isomorphic-fetch'

import { OpenAPIRoute } from '../../src/route'
import { Path } from '../../src/parameters'
import { OpenAPIRouter } from '../../src/openapi'
import { buildRequest } from '../utils'
import { jsonResp } from '../../src/utils'

const innerRouter = OpenAPIRouter({ base: '/api/v1' })
class ToDoGet extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Get a single ToDo',
    parameters: {
      id: Path(Number),
    },
    responses: {
      '200': {
        description: 'example',
        schema: {
          todo: {
            lorem: String,
            ipsum: String,
          },
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return {
      todo: {
        lorem: 'lorem',
        ipsum: 'ipsum',
      },
    }
  }
}

innerRouter.get('/todo/:id', ToDoGet)
innerRouter.all('*', () => jsonResp({ message: 'Not Found' }, { status: 404 }))

const router = OpenAPIRouter({
  schema: {
    info: {
      title: 'Radar Worker API',
      version: '1.0',
    },
  },
})

router.all('/api/v1/*', innerRouter)
router.all('*', () => new Response('Not Found.', { status: 404 }))

describe('innerRouter', () => {
  it('simpleSuccessfulCall', async () => {
    const request = await router.handle(
      buildRequest({ method: 'GET', path: `/api/v1/todo/1` })
    )
    const resp = await request.json()

    expect(request.status).toEqual(200)
    expect(resp).toEqual({
      todo: {
        lorem: 'lorem',
        ipsum: 'ipsum',
      },
    })
  })

  it('innerCatchAll', async () => {
    const request = await router.handle(
      buildRequest({ method: 'GET', path: `/api/v1/asd` })
    )
    const resp = await request.json()

    expect(request.status).toEqual(404)
    expect(resp).toEqual({ message: 'Not Found' })
  })

  it('outerCatchAll', async () => {
    const request = await router.handle(
      buildRequest({ method: 'GET', path: `/asd` })
    )
    const resp = await request.text()

    expect(request.status).toEqual(404)
    expect(resp).toEqual('Not Found.')
  })
})
