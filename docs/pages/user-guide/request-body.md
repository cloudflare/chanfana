**Please make sure to read the [Types](../types.md) page before continuing.**


You can declare Body Requests in the `request.body` property of your endpoint schema.

The validated data can be access by calling the `this.getValidatedData()` function.

For nested objects the validated data will be under the same position as defined, for example `data.body.task.name`.

In this example, the description can be either a string or an array of strings.

```ts hl_lines="7-11"
import { OpenAPIRoute, Str, Enumeration } from 'chanfana'
import { z } from 'zod'

export class ToDoCreate extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'Create a ToDo',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              title: Str(),
              description: z.string().or(z.string().array()),
              type: Enumeration({
                values: {
                  nextWeek: 'nextWeek',
                  nextMonth: 'nextMonth',
                },
              }),
            }),
          },
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
  ) {
    const data = await this.getValidatedData<typeof this.schema>()
    
    const newToDo = data.body
    // ...
  }
}
```

This can get a lot verbose, depending on your endpoint schema, so 2 tools are bundled with chanfana to make this easier.

### legacyTypeIntoZod

`legacyTypeIntoZod` allows you to send any javascript structure inside it, containing or not native types or Zod types.
It will then loop through the structure to convert everything into Zod types so that the response is well displayed.

You can even send javascript variables like strings and numbers and it will be able to parse them as well.

Notice that when using `legacyTypeIntoZod` typescript inference is not available!

Here's an example of a response schema using variables

```ts
import { OpenAPIRoute, legacyTypeIntoZod } from 'chanfana'
import { z } from 'zod'

export class ToDoCreate extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'Create a ToDo',
    request: {
      body: {
        content: {
          'application/json': {
            schema: legacyTypeIntoZod({
              title: string,
              description: "example description"
            }),
          },
        },
      },
    },
  }

  async handle(
    request: Request,
    env: any,
    context: any,
  ) {
    const data = await this.getValidatedData<typeof this.schema>()
    
    const newToDo = data.body
    // ...
  }
}
```

### contentJson

If you want even less verbose definitions you can use `contentJson`, this function will also call `legacyTypeIntoZod`
under the hood, for you to have even more flexibility.

Notice that when using `contentJson` typescript inference is not available!

```ts
import { contentJson, OpenAPIRoute } from 'chanfana'
import { z } from 'zod'

export class ToDoCreate extends OpenAPIRoute {
  schema = {
    tags: ['ToDo'],
    summary: 'Create a ToDo',
    request: {
      body: contentJson({
        title: string,
        description: 'example description',
      }),
    }
  }

  async handle(
    request: Request,
    env: any,
    context: any,
  ) {
    const data = await this.getValidatedData<typeof this.schema>()
    
    const newToDo = data.body
    // ...
  }
}
```
