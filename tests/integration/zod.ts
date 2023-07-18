import 'isomorphic-fetch'

import { OpenAPIRoute } from '../../src/route'
import { Path } from '../../src/parameters'
import { OpenAPIRouter } from '../../src/openapi'
import { buildRequest } from '../utils'
import { z } from 'zod'

const zodRouter = OpenAPIRouter()

class ToDoGet extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Get a single ToDo',
    parameters: {
      id: Path(z.number()),
    },
    requestBody: z.object({
      title: z.string(),
      description: z.string(), //.optional(),
      type: z.nativeEnum({
        nextWeek: 'nextWeek',
        nextMonth: 'nextMonth',
      }),
    }),
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

zodRouter.put('/todo/:id', ToDoGet)

describe('zod validations', () => {
  it('simpleSuccessfulCall', async () => {
    const request = await zodRouter.handle(
      buildRequest({ method: 'PUT', path: `/todo/1` })
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
})
