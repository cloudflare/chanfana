import 'isomorphic-fetch'
import { buildRequest, findError } from '../utils'
import { ToDoList, todoRouter } from '../router'

describe('openapi schema', () => {
  test('custom content type', async () => {
    const request = await todoRouter.handle(
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
})
