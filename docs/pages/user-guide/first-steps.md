Get started with a template with this command:

```bash
npm create cloudflare@latest -- --type openapi
```

## Basic concepts

Notice that this library is router agnostic, so different routers can have different implementation details.
This library tries to standarize what it can, but some things are out of scope.

One example of this is, route arguments.

Itty-router just passes along any arguments received in the `.fetch` function to the inner routes ([docs here](https://itty.dev/itty-router/concepts#we-have-simpler-handlers)).

But Hono, combines all arguments into one `c` ([docs here](https://hono.dev/docs/getting-started/basic#hello-world)).

And because chanfana is not a router! and just adds functionalities on top of other routers, we just pass along the same
arguments we receive from the router.
You will notice this in the example trough out our documentation, as every example is currently itty-router based
Example: 

```ts
// Itty-router example
export class ToDoFetch extends OpenAPIRoute {
  async handle(request: Request, env: any, context: any) {
    // ...
  }
}
```

But a Hono example would look like this:


```ts
// Hono example
export class ToDoFetch extends OpenAPIRoute {
  async handle(c) {
    // ...
  }
}
```
