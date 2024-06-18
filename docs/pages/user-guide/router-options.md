##

| Name                     | Type(s)                           | Description                                                                                            | Examples                                                                     |
|--------------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| `base`                   | `string`                          | prefixes all routes with this string                                                                    | [see documentation](https://itty.dev/itty-router/api#Router)                 |
| `schema`                 | `object`                          | Object of the common OpenAPI customizations                                                            | [see documentation](../advanced-user-guide/openapi-schema-customizations.md) |
| `docs_url`               | `string` or `null` or `undefined` | Path for swagger docs, `null`: disabled, `undefined`: `/docs`                                          | `/docs`                                                                      |
| `redoc_url`              | `string` or `null` or `undefined` | Path for redoc docs, `null`: disabled, `undefined`: `/redocs`                                          | `/redocs`                                                                    |
| `openapi_url`            | `string` or `null` or `undefined` | Path for openapi schema, `null`: disabled, `undefined`: `/openapi.json`                                | `/openapi.json`                                                              |
| `raiseUnknownParameters` | `boolean`                         | This will raise validation errors when an endpoint received an unknown query parameter                 | true                                                                         |
| `generateOperationIds`   | `boolean`                         | This will generate operation ids from class names for your endpoints when nothing is provided          | true                                                                         |
| `openapiVersion`         | `string`                          | Use this property to switch between the 3 and 3.1 OpenAPI specification, by default this will be `3.1` | `3.1`                                                                        |


## Selecting a different OpenAPI version

By default chanfana generated OpenAPI 3.1 schemas, but you can revert back to 3.0 by updating your router configuration

```ts
const router = Router()
const openAPI = fromIttyRouter(router, {
    openapiVersion: '3',
})
```
