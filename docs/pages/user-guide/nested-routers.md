For big projects, having all routes in the same file can be chaotic.

In this example we split some routes to a different router

## Hono

```ts
import { fromHono, OpenAPIRoute } from 'chanfana'
import { Hono } from 'hono'

const authors = fromHono(new Hono())
  .get('/', ListAuthors)
  .post('/', CreateAuthor)
  .get('/:id', GetAuthor)

const books = fromHono(new Hono())
  .get('/', ListBooks)
  .post('/', CreateBook)
  .get('/:id', GetBook)

const app = fromHono(new Hono())
app.route('/authors', authors)
app.route('/books', books)
```


## Itty router

```ts
// api/attacks/router.ts
import { fromIttyRouter } from 'chanfana'
import { Router } from 'itty-router'

const attacksRouter = fromIttyRouter(
  Router({
    base: '/api/v1/attacks',
  }),
  {
    base: '/api/v1/attacks',
  },
)

attacksRouter.get('/layer3/timeseries', AttacksLayer3Timeseries)

export default attacksRouter
```

```ts
// router.ts
import { fromIttyRouter } from 'chanfana'
import { Router } from 'itty-router'
import attacksRouter from 'api/attacks/router'

const router = fromIttyRouter(Router(), {
  schema: {
    info: {
      title: 'Radar Worker API',
      version: '1.0',
    },
  },
})

router.all('/api/v1/attacks/*', attacksRouter)

// Other routes
router.get('/api/v1/bgp/timeseries', BgpTimeseries)

export default router
```

Now run `wrangler dev` and go to `/docs` with your browser, here you can verify that all nested routers appear correctly,
and you are able to call every endpoint.
