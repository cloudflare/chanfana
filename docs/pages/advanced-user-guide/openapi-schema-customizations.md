# OpenAPI schema customizations

Besides adding a schema to your endpoints, its also recommended you customize your schema. This can be done by passing
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
