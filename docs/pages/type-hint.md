## Hono context

Assuming you already have your Cloudflare Bindings type defined as `Env`, start by creating another type called
`AppContext`

```ts
import {Context} from "hono";

export type Env = {
    DB: D1Database
    BUCKET: R2Bucket
    SALT_TOKEN: string
}

export type Vars = {
  // Used for c.set('key', 'value')
}

export type AppContext = Context<{ Bindings: Env, Variables: Vars }>
```

After this, just reference your new `AppContext` inside the handle function of your endpoint classes, like this:
```ts
import { OpenAPIRoute, Str } from 'chanfana'
import { AppContext } from './types'

export class TaskFetch extends OpenAPIRoute {
  schema = {...}

  async handle(c: AppContext) {
    // You will now get full autocompletes
    c.env.DB
    
    return c.text('Hello World')
  }
}
```

### Hono Middlewares

For Hono middlewares, you can reuse your previously defined AppContext and just import the Next type directly from Hono
```ts
import { AppContext } from "./types";
import { Next } from "hono";

export async function authenticateUser(c: AppContext, next: Next) {
    c.set('user_id', 'asd')

    await next()
}
```

## Request Inputs

The type hint works on `query`, `params`, `headers`, and `body` out of the box. 

To enable this, simply pass your endpoint schema to the generic type when retrieving the validated data, like this:

```ts hl_lines="17"
import { OpenAPIRoute, Str } from 'chanfana'

export class TaskFetch extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({
        taskSlug: Str({description: 'Task slug'})
      }),
    },
  }

  async handle(request: Request, env: any, context: any) {
    const data = await this.getValidatedData<typeof this.schema>()
    
    // you now get type hints, when accessing the data argument
    data.params.taskSlug
    
    // ...
  }
}
```
