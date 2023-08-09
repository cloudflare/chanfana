**Please make sure to read the [Types](../types.md) section before continuing.**


You can declare `Path` parameters in the `parameters` property of your endpoint schema.

The validated data is available under `data.params.<name>`, where name is the key used inside the `parameters` property.
 
## Basic parameter

For basic parameters you are fine using the Native types, this should cover almost everything you need to build a big
project.

```ts hl_lines="8-10"
import { OpenAPIRoute, Path, Int } from '@cloudflare/itty-router-openapi'

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    parameters: {
      todoId: Path(Int, {
        description: 'ToDo ID',
      }),
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const { todoId } = data.params
    // ...
  }
}
```

Then remember to register the endpoint with the parameter name in the url starting with `:`

```ts
router.get('/todos/:todoId', ToDoFetch)
```

## Advanced parameters

If you need a more advanced control over the validation, you should use [Zod](https://zod.dev/).

Here is an example that allows only number lower than 10 in the path

```ts hl_lines="9-11"
import { OpenAPIRoute, Path } from '@cloudflare/itty-router-openapi'
import {z} from 'zod'

export class ToDoFetch extends OpenAPIRoute {
  static schema = {
    tags: ['ToDo'],
    summary: 'Fetch a ToDo',
    parameters: {
      todoId: Path(z.coerce.number().lt(10), {
        description: 'ToDo ID',
      }),
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
    data: any
  ) {
    const { todoId } = data.params
    // ...
  }
}
```
