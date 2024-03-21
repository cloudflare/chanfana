Starting on version 1.1.0, itty-router-openapi now gives full type hints and checks when writing your endpoint's code.

The type hint works on `Query`, `Path`, `Header`, and `requestBody` out of the box. 

To enable this, simply change the data type of the `data` argumento into `DataOf<typeof YourEndpointClass.schema>`, like this:

```ts hl_lines="17"
import {
  OpenAPIRoute,
  Path,
  Str,
  DataOf,
} from '@cloudflare/itty-router-openapi'

export class TaskFetch extends OpenAPIRoute {
  static schema = {
    parameters: {
      taskSlug: Path(Str, {
        description: 'Task slug',
      }),
    },
  }

  async handle(request: Request, env: any, context: any, data: DataOf<typeof TaskFetch.schema>) {
    // you now get type hints, when accessing the data argument
    data.params.taskSlug
    
    // ...
  }
}
```
!!! warning

    Note that you need to pass your endpoint class name into the new `DataOf` type for it to work

The new type hint is 100% optional, so existing endpoints don't need to do anything to continue working.
