For big projects, having all routes in the same file can be chaotic.

In this example we split some routes to a different router

```ts
// api/attacks/router.ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

export const attacksRouter = OpenAPIRouter({ base: '/api/v1/attacks' })

attacksRouter.get('/layer3/timeseries', AttacksLayer3Timeseries)
```

```ts
// router.ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'
import { attacksRouter } from 'api/attacks/router'

export const router = OpenAPIRouter({
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
```

Now run `wrangler dev` and go to `/docs` with your browser, here you can verify that all nested routers appear correctly
and you are able to call every endpoint.
