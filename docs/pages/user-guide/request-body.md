**Please make sure to read the [Types](../types.md) page before continuing.**


You can declare Body Requests in the `requestBody` property of your endpoint schema.

The validated data is available under `data.body.<name>`, where name is the key used inside the `requestBody` property.

For nested objects the validated data will be under the same position as defined, for example `data.body.task.name`.
 
## Basic parameter

For basic parameters you are fine using the Native types, this should cover almost everything you need to build a big
project.

Defining a schema using native types is as simple as defining a without any special parameters.

In this example we are defining a object with an optional `description` and an array of strings `steps`.

```ts hl_lines="7-11"
import { OpenAPIRoute, Query, Str } from '@cloudflare/itty-router-openapi'

export class ToDoCreate extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Create a ToDo',
    requestBody: {
      name: String,
      description: new Str({required: false}),
      steps: [new Str({example: 'open the door'})]
    }
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const newToDo = data.body
    // ...
  }
}
```

## Advanced parameters

If you need a more advanced control over the validation, you should use [Zod](https://zod.dev/).

Zod types can be used inside itty-router-openapi native types!

While the previous example will work well, you might want more control, like make the description a string or an array of strings.

```ts hl_lines="8-12"
import { OpenAPIRoute, Query } from '@cloudflare/itty-router-openapi'
import {z} from 'zod'

export class ToDoCreate extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Create a ToDo',
    requestBody: {
      name: String,
      description: z.string().or(z.string().array()),
      steps: [new Str({example: 'open the door'})]
    }
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const { limit } = data.query
    // ...
  }
}
```

Or you can define the exact same request body as above all in Zod

```ts hl_lines="8-12"
import { OpenAPIRoute, Query } from '@cloudflare/itty-router-openapi'
import {z} from 'zod'

export class ToDoCreate extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Create a ToDo',
    requestBody: z.object({
      name: z.string(),
      description: z.string().or(z.string().array()),
      steps: z.string().array()
    })
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const { limit } = data.query
    // ...
  }
}
```
