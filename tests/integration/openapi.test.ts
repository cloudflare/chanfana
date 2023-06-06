import { todoRouter } from '../router'
import jestOpenAPI from 'jest-openapi'

describe('openapiValidation', () => {
  it('loadSpec', async () => {
    jestOpenAPI(todoRouter.schema)
  })
})
