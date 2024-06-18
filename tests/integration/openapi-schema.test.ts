import 'isomorphic-fetch'
import { buildRequest, findError } from '../utils'
import { ToDoGet, ToDoList, todoRouter } from '../router'
import { fromIttyRouter } from '../../src'
import { AutoRouter } from 'itty-router'

describe('openapi schema', () => {
  test('custom content type', async () => {
    const request = await todoRouter.fetch(
      buildRequest({ method: 'GET', path: '/openapi.json' })
    )
    const resp = await request.json()
    const respSchema = resp.paths['/contenttype'].get.responses[200]

    expect(respSchema.contentType).toBeUndefined()
    expect(respSchema.content).toEqual({
      'text/csv': {
        schema: {
          type: 'string',
        },
      },
    })
  })

  it('with base defined', async () => {
    const router = fromIttyRouter(AutoRouter({ base: '/api' }), {
      base: '/api',
    })
    router.get('/todo', ToDoGet)

    const request = await router.fetch(
      buildRequest({ method: 'GET', path: '/api/openapi.json' })
    )
    const resp = await request.json()

    expect(Object.keys(resp.paths)[0]).toEqual('/api/todo')
  })
})
