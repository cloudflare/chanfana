import 'isomorphic-fetch'
import { buildRequest, findError } from '../utils'
import { ToDoList, todoRouter } from '../router'

describe('queryParametersValidation', () => {
  test('requiredFields', async () => {
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: '/todos' })
    )
    const resp = await request.json()

    // minus 1, because 1 parameter is optional
    expect(resp.errors.length).toEqual(
      Object.keys(ToDoList.schema.parameters).length - 1
    )

    // sanity check some parameters
    expect(findError(resp.errors, 'p_number')).toEqual(
      'Expected number, received nan'
    )
    expect(findError(resp.errors, 'p_boolean')).toEqual(
      "Invalid enum value. Expected 'true' | 'false', received 'undefined'"
    )
  })

  test('checkNumberInvalid', async () => {
    const qs = '?p_number=asd'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_number')).toEqual(
      'Expected number, received nan'
    )
  })

  test('checkNumberValidFloat', async () => {
    const qs = '?p_number=12.3'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_number')).toBeUndefined()
  })

  test('checkNumberValidInteger', async () => {
    const qs = '?p_number=12'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_number')).toBeUndefined()
  })

  test('checkStringValid', async () => {
    const qs = '?p_string=asd21_sa'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_string')).toBeUndefined()
  })

  test('checkBooleanInvalid', async () => {
    const qs = '?p_boolean=asd'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_boolean')).toEqual(
      "Invalid enum value. Expected 'true' | 'false', received 'asd'"
    )
  })

  test('checkBooleanValid', async () => {
    const qs = '?p_boolean=false'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_boolean')).toBeUndefined()
  })

  test('checkBooleanValidCaseInsensitive', async () => {
    const qs = '?p_boolean=TrUe'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_boolean')).toBeUndefined()
  })

  test('checkEnumerationSensitiveInvalid', async () => {
    const qs = '?p_enumeration=sfDase'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_enumeration')).toEqual(
      "Invalid enum value. Expected 'json' | 'csv', received 'sfDase'"
    )
  })

  test('checkEnumerationSensitiveInvalidCase', async () => {
    const qs = '?p_enumeration=Csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_enumeration')).toEqual(
      "Invalid enum value. Expected 'json' | 'csv', received 'Csv'"
    )
  })

  test('checkEnumerationSensitiveValid', async () => {
    const qs = '?p_enumeration=csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_enumeration')).toBeUndefined()
  })

  test('checkEnumerationInsensitiveInvalid', async () => {
    const qs = '?p_enumeration_insensitive=sfDase'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_enumeration_insensitive')).toEqual(
      "Invalid enum value. Expected 'json' | 'csv', received 'sfdase'"
    )
  })

  test('checkEnumerationInsensitiveValidCase', async () => {
    const qs = '?p_enumeration_insensitive=Csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_enumeration_insensitive')).toBeUndefined()
  })

  test('checkEnumerationInsensitiveValid', async () => {
    const qs = '?p_enumeration_insensitive=csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_enumeration_insensitive')).toBeUndefined()
  })

  test('checkDatetimeInvalid', async () => {
    const qs = '?p_datetime=2023-13-01'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_datetime')).toEqual('Invalid datetime')
  })

  test('checkDatetimeInvalid2', async () => {
    const qs = '?p_datetime=sdfg'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_datetime')).toEqual('Invalid datetime')
  })

  test('checkDatetimeInvalid3', async () => {
    const qs = '?p_datetime=2022-09-15T00:00:00+01Z'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_datetime')).toEqual('Invalid datetime')
  })

  test('checkDatetimeValid', async () => {
    const qs = '?p_datetime=2022-09-15T00:00:01Z'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_datetime')).toBeUndefined()
  })

  test('checkDatetimeValid2', async () => {
    const qs = '?p_datetime=2022-09-15T00:00:00Z'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_datetime')).toBeUndefined()
  })

  test('checkDateInvalid', async () => {
    const qs = '?p_dateonly=2022-13-15'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_dateonly')).toEqual('Invalid date')
  })

  test('checkDateInvalid3', async () => {
    const qs = '?p_dateonly=2022-09-15T00:0f0:00.0Z'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_dateonly')).toEqual('Invalid date')
  })

  test('checkDateValid', async () => {
    const qs = '?p_dateonly=2022-09-15'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_dateonly')).toBeUndefined()
  })

  test('checkRegexInvalid', async () => {
    const qs = '?p_regex=123765'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_regex')).toBeTruthy()
  })

  test('checkRegexValid', async () => {
    const qs = '?p_regex=+919367788755'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_regex')).toBeUndefined()
  })

  test('checkEmailInvalid', async () => {
    const qs = '?p_email=asfdgsdf'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_email')).toEqual('Invalid email')
  })

  test('checkEmailInvalid2', async () => {
    const qs = '?p_email=asfdgsdf@gmail'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_email')).toEqual('Invalid email')
  })

  test('checkEmailInvalid3', async () => {
    const qs = '?p_email=@gmail.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_email')).toEqual('Invalid email')
  })

  test('checkEmailValid', async () => {
    const qs = '?p_email=sdfg@gmail.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_email')).toBeUndefined()
  })

  test('checkUuidInvalid', async () => {
    const qs = '?p_uuid=f31f890-044b-11ee-be56-0242ac120002'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_uuid')).toEqual('Invalid uuid')
  })

  test('checkUuidInvalid2', async () => {
    const qs = '?p_uuid=asdf-sdfg-dsfg-sfdg'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_uuid')).toEqual('Invalid uuid')
  })

  test('checkUuidValid', async () => {
    const qs = '?p_uuid=f31f8b90-044b-11ee-be56-0242ac120002'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_uuid')).toBeUndefined()
  })

  test('checkUuidValid2', async () => {
    const qs = '?p_uuid=f5f26194-0b07-45a4-9a85-94d3db01e7a5'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_uuid')).toBeUndefined()
  })

  test('checkHostnameInvalid', async () => {
    const qs = '?p_hostname=.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_hostname')).toEqual('Invalid')
  })

  test('checkHostnameValid', async () => {
    const qs = '?p_hostname=cloudflare.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_hostname')).toBeUndefined()
  })

  test('checkHostnameValid2', async () => {
    const qs = '?p_hostname=radar.cloudflare.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_hostname')).toBeUndefined()
  })

  test('checkIpv4Invalid', async () => {
    const qs = '?p_ipv4=asdfrre.wer.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_ipv4')).toEqual('Invalid ip')
  })

  test('checkIpv4Invalid2', async () => {
    const qs = '?p_ipv4=2001:0db8:85a3:0000:0000:8a2e:0370:7334'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_ipv4')).toEqual('Invalid ip')
  })

  test('checkIpv4Valid', async () => {
    const qs = '?p_ipv4=1.1.1.1'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_ipv4')).toBeUndefined()
  })

  test('checkIpv6Invalid', async () => {
    const qs = '?p_ipv6=asdfrre.wer.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_ipv6')).toEqual('Invalid ip')
  })

  test('checkIpv6Invalid2', async () => {
    const qs = '?p_ipv6=1.1.1.1'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_ipv6')).toEqual('Invalid ip')
  })

  test('checkIpv6Valid', async () => {
    const qs = '?p_ipv6=2001:0db8:85a3:0000:0000:8a2e:0370:7336'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_ipv6')).toBeUndefined()
  })

  test('checkOptionalMissing', async () => {
    const qs = '?'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_optional')).toBeUndefined()
  })

  test('checkOptionalInvalid', async () => {
    const qs = '?p_optional=asfdasd'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_optional')).toEqual(
      'Expected number, received nan'
    )
  })

  test('checkOptionalValid', async () => {
    const qs = '?p_optional=32'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(findError(resp.errors, 'p_optional')).toBeUndefined()
  })
})

describe('bodyParametersValidation', () => {
  test('requiredFieldTitle', async () => {
    const request = await todoRouter.handle(
      buildRequest({
        method: 'POST',
        path: '/todos',
        json: () => {
          return {}
        },
      })
    )
    const resp = await request.json()

    expect(request.status).toEqual(400)

    // the current body implementation only validates 1 field at time
    expect(findError(resp.errors, 'title')).toEqual('Required')
  })

  test('requiredFieldTipe', async () => {
    const request = await todoRouter.handle(
      buildRequest({
        method: 'POST',
        path: '/todos',
        json: () => {
          return {
            title: 'my todo',
          }
        },
      })
    )
    const resp = await request.json()

    expect(request.status).toEqual(400)

    // the current body implementation only validates 1 field at time
    expect(findError(resp.errors, 'type')).toEqual('Required')
  })

  test('validRequest', async () => {
    const request = await todoRouter.handle(
      buildRequest({
        method: 'POST',
        path: '/todos',
        json: () => {
          return {
            title: 'my todo',
            type: 'nextWeek',
          }
        },
      }),
      {},
      {}
    )
    const resp = await request.json()

    expect(request.status).toEqual(200)

    expect(resp).toEqual({
      todo: { title: 'my todo', type: 'nextWeek', description: null },
    })
  })

  test('validRequestWithOptionalParameters', async () => {
    const request = await todoRouter.handle(
      buildRequest({
        method: 'POST',
        path: '/todos',
        json: () => {
          return {
            title: 'my todo',
            description: 'this will be done',
            type: 'nextWeek',
          }
        },
      }),
      {},
      {}
    )
    const resp = await request.json()

    expect(request.status).toEqual(200)

    expect(resp).toEqual({
      todo: {
        title: 'my todo',
        description: 'this will be done',
        type: 'nextWeek',
      },
    })
  })
})
