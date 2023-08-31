Hiding routes can be archived by registering your endpoints in the original `itty-router`,as shown here:

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()

router.original.get(
  '/todos/:id',
  ({ params }) => new Response(`Todo #${params.id}`)
)
```

This endpoint will still be accessible, but will not be shown in the schema.

## Defining redirects

This is also useful to define redirects, like this:

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'
import { TaskFetch } from './tasks'

const router = OpenAPIRouter()

// Redirect to docs page
router.original.get('/', (request) => Response.redirect(`${request.url}docs`, 302))

export default {
  fetch: router.handle,
}
```
