CORS support is a feature from [itty-router](https://github.com/kwhitley/itty-router),
read more about it [here](https://itty.dev/itty-router/cors).

Here's a quick example for setting up CORS for your endpoints:

```ts
import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { createCors } from 'itty-router'

export const router = OpenAPIRouter();
const { preflight, corsify } = createCors()

// embed preflight upstream to handle all OPTIONS requests
router.all('*', preflight)

// register the endpoints that will need cors after the previous line
router.post('/api/auth/register', AuthRegister);
router.post('/api/auth/login', AuthLogin);

export default {
    fetch: async (request, env, ctx) => {
       return router.handle(request, env, ctx).then(corsify)
    },
};
```
