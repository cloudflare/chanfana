# OpenAPI schema customizations

Besides adding a schema to your endpoints, its also recommended you customize your schema. This can be done by passing
the schema argument when creating your router. 

All [OpenAPI Object Properties](https://swagger.io/specification/#schema) except `paths`, `components` and `webhooks` are
available.

`paths` can only be added by registering routes like:
```ts
const router = OpenAPIRouter()
router.post('/scan/metadata/', ScanMetadataCreate)
```

`components` can only be added by registering them in the main router like:
```ts
const router = OpenAPIRouter()
const bearerAuth = router.registry.registerComponent(
  'securitySchemes',
  'bearerAuth',
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
)
```

Every other property must be defined in your main/root router as such:

```ts
const router = OpenAPIRouter({
  schema: {
    info: {
      title: 'Radar Worker API',
      version: '1.0',
    },
    servers: [
      {
        "url": "https://development.gigantic-server.com/v1",
        "description": "Development server"
      },
      {
        "url": "https://staging.gigantic-server.com/v1",
        "description": "Staging server"
      },
      {
        "url": "https://api.gigantic-server.com/v1",
        "description": "Production server"
      }
    ]
  },
})
```

For more information on the structure of every available property you can read the specification for 
[OpenAPI 3 here](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md) and
[OpenAPI 3.1 here](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md).
