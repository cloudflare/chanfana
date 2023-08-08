### 2. Using Javascript types

If you are planning on using this lib with Typescript, then declaring schemas is even easier than with Javascript
because instead of importing the parameter types, you can use the native Typescript data types `String`, `Number`,
or `Boolean`.

```ts
export class ToDoList extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'List all ToDos',
    parameters: {
      page: Query(Number, {
        description: 'Page number',
        default: 1,
        required: false,
      }),
    },
    responses: {
      '200': {
        schema: {
          currentPage: Number,
          nextPage: Number,
          results: [String],
        },
      },
    },
  }
  // ...
}
```


#### Example Enumeration:

Enumerations like the other types can be defined both inline or as a variable outside the schema.

```ts
import { Enumeration } from '@cloudflare/itty-router-openapi'

parameters = {
  format: Query(Enumeration, {
    description: 'Format the response should be returned',
    default: 'json',
    required: false,
    values: {
      json: 'json',
      csv: 'csv',
    },
  }),
}
```

#### Example Enumeration not case sensitive:

This way, the client can call any combination of upper and lower characters and it will still be a valid input.

```ts
import { Enumeration } from '@cloudflare/itty-router-openapi'

const formatsEnum = new Enumeration({
  enumCaseSensitive: false,
  values: {
    json: 'json',
    csv: 'csv',
  },
})

parameters = {
  format: Query(formatsEnum, {
    description: 'Format the response should be returned',
    default: 'json',
    required: false,
  }),
}
```
