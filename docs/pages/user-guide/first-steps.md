First, create a new directory, and use [wrangler](https://github.com/cloudflare/wrangler2), our command line tool for
building Cloudflare Workers, which we assume
you have [installed](https://github.com/cloudflare/wrangler2#installation) already, to initialize the project:

<!-- termynal -->
```bash
mkdir openapi-example && cd openapi-example
wrangler init

---> 100%
```

And install itty-router-openapi

<!-- termynal -->
```bash
npm i @cloudflare/itty-router-openapi --save

---> 100%
```

Then in the `src/index.ts` place this, the smallest router you can have in itty-router-openapi.

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()

export default {
  fetch: router.handle,
}
```

Now when running `wrangler dev` you see server logs

<!-- termynal -->
```bash
$ wrangler dev

 ⛅️ wrangler 3.4.0
------------------
wrangler dev now uses local mode by default, powered by 🔥 Miniflare and 👷 workerd.
To run an edge preview session for your Worker, use wrangler dev --remote
⎔ Starting local server...
⎔ Reloading local server...
[mf:inf] Ready on http://127.0.0.1:8787/
[mf:inf] Updated and ready on http://127.0.0.1:8787/
```

You can now open `http://127.0.0.1:8787/docs` in your browser to see the Swagger UI, that will hold
your future endpoints.

// TODO screenshot /docs

You can also open the `http://127.0.0.1:8787/redocs` to see an alternative version with the same endpoints.

// TODO screenshot /redocs

## Creating your first endpoint

This is the simplest endpoint you can create, that don't receive any parameters, neither have a response format
defined.

```ts
import { OpenAPIRoute } from '@cloudflare/itty-router-openapi'

export class ListEndpoint extends OpenAPIRoute {
  async handle(request: Request, env: any, context: any, data: any) {
    return ["cloudflare", "workers"]
  }
}
```

After this you must register the endpoint in the initial router, so your `src/index.ts` should look something
like this:
```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter()
router.get('/list/', ListEndpoint)

export default {
  fetch: router.handle,
}
```

Now when opening the `/docs` you will see your new endpoint and be able to test it right away.


// TODO screenshot /docs with endpoint

