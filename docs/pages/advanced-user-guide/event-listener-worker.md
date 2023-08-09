# Worker using addEventListener

If you want to use the `addEventListener` instead of exporting an object, you can define your worker like this:

```ts
import { OpenAPIRouter, OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = { ... }

  async handle(request: Request, data: any) {
    const { page } = data

    return {
      currentPage: page,
      nextPage: page + 1,
      results: ['lorem', 'ipsum'],
    }
  }
}

const router = OpenAPIRouter()
router.get('/todos', ToDoList)

addEventListener('fetch', (event) => event.respondWith(router.handle(event.request)))
```

You can also pass other `event` parameters to the endpoint, by adding them in the `addEventListener` function

```ts
import { OpenAPIRouter, OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ToDoList extends OpenAPIRoute {
  static schema = { ... }

  async handle(request: Request, waitUntil: any, data: any) {
    const { page } = data

    return {
      currentPage: page,
      nextPage: page + 1,
      results: ['lorem', 'ipsum'],
    }
  }
}

const router = OpenAPIRouter()
router.get('/todos', ToDoList)

addEventListener('fetch', (event) => event.respondWith(router.handle(event.request, event.waitUntil.bind(event))))
```

Notice that, in this last example the endpoint is receiving an extra `waitUntil` parameter.

Learn more
about [Cloudflare Workers addEventListener here](https://developers.cloudflare.com/workers/runtime-apis/add-event-listener/).
