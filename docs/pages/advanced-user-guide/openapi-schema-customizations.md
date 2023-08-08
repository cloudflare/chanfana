### 4. Core openapi schema customizations

Besides adding a schema to your endpoints, its also recomended you customize your schema. This can be done by passing
the schema argument when creating your router. All [OpenAPI Fixed Fields](https://swagger.io/specification/#schema) are
available.

The example bellow will change the schema title, and add a Bearer token authentication to all endpoints

```ts
const router = OpenAPIRouter({
  schema: {
    info: {
      title: 'Radar Worker API',
      version: '1.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
})
```

### 5. Hiding routes in the OpenAPI schema

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
