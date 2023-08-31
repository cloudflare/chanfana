# Migrating existing itty-router applications

All it takes is changing one line of code. After installing `itty-router-openapi` replace `Router` with the
new `OpenAPIRouter` function.

```ts
// Old router
//import { Router } from 'itty-router'
//const router = Router()

// New router
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()

// Old routes remain the same
router.get('/todos', () => new Response('Todos Index!'))
router.get('/todos/:id', ({ params }) => new Response(`Todo #${params.id}`))

// ...
```

Now, when running the application, go to `/docs`. You will see your endpoints listed with the Path parameters
automatically parsed and ready to be invoked.
