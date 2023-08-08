import 'isomorphic-fetch'
import { todoRouter } from '../router'
import jestOpenAPI from 'jest-openapi'

describe('openapiValidation', () => {
  it('loadSpec', async () => {
    // @ts-ignore
    jestOpenAPI(todoRouter.schema)
  })
})
