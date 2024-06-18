If you don't want a route to be displayed in the openapi schema, just register it in the base router

```ts
import { fromIttyRouter } from 'chanfana'
import { Router } from 'itty-router'

const router = Router()
const openAPI = fromIttyRouter(router)

router.get(
  '/todos/:id',
  ({ params }) => new Response(`Todo #${params.id}`)
)
```

This endpoint will still be accessible, but will not be shown in the schema.
