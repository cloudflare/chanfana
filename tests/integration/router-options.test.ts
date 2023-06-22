import 'isomorphic-fetch'

import { OpenAPIRoute } from '../../src/route'
import { OpenAPIRouter } from '../../src/openapi'
import { buildRequest } from '../utils'

class EndpointWithoutOperationId extends OpenAPIRoute {
  static schema = {
    summary: 'Get a single ToDo',
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return data
  }
}

class EndpointWithOperationId extends OpenAPIRoute {
  static schema = {
    operationId: 'get_my_todo',
    summary: 'Get a single ToDo',
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return data
  }
}

describe('routerOptions', () => {
  it('generate operation ids false', async () => {
    const t = () => {
      const router = OpenAPIRouter({
        generateOperationIds: false,
      })
      router.get('/todo', EndpointWithoutOperationId)
    }

    expect(t).toThrow("Route /todo don't have operationId set!")
  })

  it('generate operation ids true and unset', async () => {
    const routerTrue = OpenAPIRouter({
      generateOperationIds: true,
    })
    routerTrue.get('/todo', EndpointWithoutOperationId)
    expect(routerTrue.schema.paths['/todo'].get.operationId).toEqual(
      'get_EndpointWithoutOperationId'
    )

    const routerUnset = OpenAPIRouter()
    routerUnset.get('/todo', EndpointWithoutOperationId)
    expect(routerUnset.schema.paths['/todo'].get.operationId).toEqual(
      'get_EndpointWithoutOperationId'
    )
  })

  it('generate operation ids true on endpoint with operation id', async () => {
    const router = OpenAPIRouter({
      generateOperationIds: true,
    })
    router.get('/todo', EndpointWithOperationId)
    expect(router.schema.paths['/todo'].get.operationId).toEqual('get_my_todo')
  })
})
