import * as newParams from './utils'
import { Str } from './utils'

function Obj({ properties = {}, required = [] } = {}) {
  // Deprecated, TODO: remove later
  return new newParams.Obj(properties).getValue()
}

function SuccessfulResponseSchema({ properties = {}, required = [] } = {}) {
  const commonProperties = {
    success: new Str({ example: true }).getValue(),
    // errors: Arr({ items: Obj({ properties: { code: new Str({}), message: new Str({}) } }) }),
    //errors: Arr({items: Obj({properties: {}})})
  }
  const mergedProperties = { ...commonProperties, ...properties }
  const param = {
    type: 'object',
    properties: mergedProperties,
  }

  if (required) {
    param.required = required
  }

  return param
}

function Resp({ description = null, contentType = 'application/json', schema = {} } = {}) {
  const param = {
    description: description,
    content: {},
  }

  param.content[contentType] = { schema: schema }

  return param
}

function Body({ description = null, contentType = 'application/json', schema = {} } = {}) {
  const param = {
    description: description,
    content: {},
  }

  param.content[contentType] = { schema: schema }

  return param
}

function Arr({ items = {} } = {}) {
  if (items.isParameter !== true) {
    return {
      type: 'array',
      items: items,
    }
  }

  // Deprecated, TODO: remove later
  return new newParams.Arr(items).getValue()
}

export { Body, Obj, Arr, Resp, SuccessfulResponseSchema }
