import 'isomorphic-fetch'
import { buildRequest } from '../utils'
import { ToDoList, todoRouter } from '../router'

describe('queryParametersValidation', () => {
  test('requiredFields', async () => {
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: '/todos' })
    )
    const resp = await request.json()

    // minus 1, because 1 parameter is optional
    expect(Object.keys(resp.errors).length).toEqual(
      Object.keys(ToDoList.schema.parameters).length - 1
    )

    // sanity check some parameters
    expect(resp.errors.p_number).toEqual('is required')
    expect(resp.errors.p_boolean).toEqual('is required')
  })

  test('checkNumberInvalid', async () => {
    const qs = '?p_number=asd'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_number).toEqual('is not a valid number')
  })

  test('checkNumberValidFloat', async () => {
    const qs = '?p_number=12.3'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_number).toBeUndefined()
  })

  test('checkNumberValidInteger', async () => {
    const qs = '?p_number=12'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_number).toBeUndefined()
  })

  test('checkStringValid', async () => {
    const qs = '?p_string=asd21_sa'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_string).toBeUndefined()
  })

  test('checkBooleanInvalid', async () => {
    const qs = '?p_boolean=asd'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_boolean).toEqual(
      'is not a valid boolean, allowed values are true or false'
    )
  })

  test('checkBooleanValid', async () => {
    const qs = '?p_boolean=false'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_boolean).toBeUndefined()
  })

  test('checkBooleanValidCaseInsensitive', async () => {
    const qs = '?p_boolean=TrUe'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_boolean).toBeUndefined()
  })

  test('checkEnumerationSensitiveInvalid', async () => {
    const qs = '?p_enumeration=sfDase'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_enumeration).toEqual('is not one of available options')
  })

  test('checkEnumerationSensitiveInvalidCase', async () => {
    const qs = '?p_enumeration=Csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_enumeration).toEqual('is not one of available options')
  })

  test('checkEnumerationSensitiveValid', async () => {
    const qs = '?p_enumeration=csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_enumeration).toBeUndefined()
  })

  test('checkEnumerationInsensitiveInvalid', async () => {
    const qs = '?p_enumeration_insensitive=sfDase'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_enumeration_insensitive).toEqual(
      'is not one of available options'
    )
  })

  test('checkEnumerationInsensitiveValidCase', async () => {
    const qs = '?p_enumeration_insensitive=Csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_enumeration_insensitive).toBeUndefined()
  })

  test('checkEnumerationInsensitiveValid', async () => {
    const qs = '?p_enumeration_insensitive=csv'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_enumeration_insensitive).toBeUndefined()
  })

  test('checkDatetimeInvalid', async () => {
    const qs = '?p_datetime=2023-13-01'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_datetime).toEqual('is not a valid date time')
  })

  test('checkDatetimeInvalid2', async () => {
    const qs = '?p_datetime=sdfg'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_datetime).toEqual('is not a valid date time')
  })

  test('checkDatetimeInvalid3', async () => {
    const qs = '?p_datetime=2022-09-15T00:00:00+01Z'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_datetime).toEqual('is not a valid date time')
  })

  test('checkDatetimeValid', async () => {
    const qs = '?p_datetime=2022-09-15'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_datetime).toBeUndefined()
  })

  test('checkDatetimeValid2', async () => {
    const qs = '?p_datetime=2022-09-15T00:00:00Z'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_datetime).toBeUndefined()
  })

  test('checkDateInvalid', async () => {
    const qs = '?p_dateonly=2022-13-15'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_dateonly).toEqual('is not a valid date')
  })

  test('checkDateInvalid2', async () => {
    const qs = '?p_dateonly=2022-10'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_dateonly).toEqual('is not a valid date')
  })

  test('checkDateInvalid3', async () => {
    const qs = '?p_dateonly=2022-09-15T00:00:00Z'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_dateonly).toEqual('is not a valid date')
  })

  test('checkDateValid', async () => {
    const qs = '?p_dateonly=2022-09-15'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_dateonly).toBeUndefined()
  })

  test('checkRegexInvalid', async () => {
    const qs = '?p_regex=123765'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(
      resp.errors.p_regex.includes('does not match the pattern')
    ).toBeTruthy()
  })

  test('checkRegexValid', async () => {
    const qs = '?p_regex=' + encodeURIComponent('+919367788755')
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_regex).toBeUndefined()
  })

  test('checkEmailInvalid', async () => {
    const qs = '?p_email=asfdgsdf'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_email).toEqual('is not a valid email')
  })

  test('checkEmailInvalid2', async () => {
    const qs = '?p_email=asfdgsdf@gmail'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_email).toEqual('is not a valid email')
  })

  test('checkEmailInvalid3', async () => {
    const qs = '?p_email=@gmail.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_email).toEqual('is not a valid email')
  })

  test('checkEmailValid', async () => {
    const qs = '?p_email=sdfg@gmail.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_email).toBeUndefined()
  })

  test('checkUuidInvalid', async () => {
    const qs = '?p_uuid=f31f890-044b-11ee-be56-0242ac120002'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_uuid).toEqual('is not a valid uuid')
  })

  test('checkUuidInvalid2', async () => {
    const qs = '?p_uuid=asdf-sdfg-dsfg-sfdg'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_uuid).toEqual('is not a valid uuid')
  })

  test('checkUuidValid', async () => {
    const qs = '?p_uuid=f31f8b90-044b-11ee-be56-0242ac120002'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_uuid).toBeUndefined()
  })

  test('checkUuidValid2', async () => {
    const qs = '?p_uuid=f5f26194-0b07-45a4-9a85-94d3db01e7a5'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_uuid).toBeUndefined()
  })

  test('checkHostnameInvalid', async () => {
    const qs = '?p_hostname=.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_hostname).toEqual('is not a valid hostname')
  })

  test('checkHostnameValid', async () => {
    const qs = '?p_hostname=cloudflare.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_hostname).toBeUndefined()
  })

  test('checkHostnameValid2', async () => {
    const qs = '?p_hostname=radar.cloudflare.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_hostname).toBeUndefined()
  })

  test('checkIpv4Invalid', async () => {
    const qs = '?p_ipv4=asdfrre.wer.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_ipv4).toEqual('is not a valid ipv4')
  })

  test('checkIpv4Invalid2', async () => {
    const qs = '?p_ipv4=2001:0db8:85a3:0000:0000:8a2e:0370:7334'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_ipv4).toEqual('is not a valid ipv4')
  })

  test('checkIpv4Valid', async () => {
    const qs = '?p_ipv4=1.1.1.1'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_ipv4).toBeUndefined()
  })

  test('checkIpv6Invalid', async () => {
    const qs = '?p_ipv6=asdfrre.wer.com'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_ipv6).toEqual('is not a valid ipv6')
  })

  test('checkIpv6Invalid2', async () => {
    const qs = '?p_ipv6=1.1.1.1'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_ipv6).toEqual('is not a valid ipv6')
  })

  test('checkIpv6Valid', async () => {
    const qs = '?p_ipv6=2001:0db8:85a3:0000:0000:8a2e:0370:7336'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_ipv6).toBeUndefined()
  })

  test('checkOptionalMissing', async () => {
    const qs = '?'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_optional).toBeUndefined()
  })

  test('checkOptionalInvalid', async () => {
    const qs = '?p_optional=asfdasd'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_optional).toEqual('is not a valid number')
  })

  test('checkOptionalValid', async () => {
    const qs = '?p_optional=32'
    const request = await todoRouter.handle(
      buildRequest({ method: 'GET', path: `/todos${qs}` })
    )
    const resp = await request.json()

    expect(resp.errors.p_optional).toBeUndefined()
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
    expect(resp.errors['body.title']).toEqual('is required')
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
    expect(resp.errors['body.type']).toEqual('is required')
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

    expect(resp).toEqual({ todo: { title: 'my todo', type: 'nextWeek' } })
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
