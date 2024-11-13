In order to customize the zod error formats, just overwrite the `handleValidationError` function in your endpoint class

```ts
import { OpenAPIRoute } from 'chanfana'
import { Context } from 'hono'

export class ToDoList extends OpenAPIRoute {
  schema = {
    // ...
  }

  handleValidationError(errors: z.ZodIssue[]): Response {
    return Response.json({
      errors: errors,
      success: false,
      result: {},
    }, {
      status: 400,
    })
  }

  async handle(c: Context) {
    // ...
  }
}
```

## Reusing errors handlers across the project

First define a generic class that extends `OpenAPIRoute`, in this function define you cross endpoint functions

```ts
import { OpenAPIRoute } from "chanfana";

class MyProjectRoute extends OpenAPIRoute {
  handleValidationError(errors: z.ZodIssue[]): Response {
    return Response.json({
      errors: errors,
      success: false,
      result: {},
    }, {
      status: 400,
    })
  }
}
```

Then, in your endpoint extend from the new class

```ts
import { MyProjectRoute } from './route'
import { Context } from 'hono'

export class ToDoList extends MyProjectRoute {
  schema = {
    // ...
  }

  async handle(c: Context) {
    // ...
  }
}
```
