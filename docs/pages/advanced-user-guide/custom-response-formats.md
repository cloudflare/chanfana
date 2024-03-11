## Describing a binary file:

```ts
import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        contentType: 'application/pdf',
        schema: new Str({ format: 'binary' }),
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    // ...
  }
}
```

## Describing a XML response:

```ts
import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        contentType: 'application/xml',
        schema: new Obj(
          {
            code: new Str({ example: '13335' }),
            name: new Str({ example: 'Cloudflare' }),
            type: new Str({ example: 'asn' }),
          },
          { xml: { name: 'root' } }
        ),
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    // ...
  }
}
```

## Describing multiple content types:

```ts
import { OpenAPIRoute, Str } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = {
    summary: 'My summary of a custom pdf file endpoint.',
    responses: {
      '200': {
        contentType: 'application/xml',
        content: {
          'application/json': {
            schema: {
              foo: 'bar'
            }
          },
          'audio/mpeg': {
            schema: new Str({ format: 'binary' })
          }
        },
      },
    },
  }

  async handle(request: Request, env: any, context: any, data: any) {
    // ...
  }
}
```
