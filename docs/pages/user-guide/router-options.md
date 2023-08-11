## `OpenAPIRouter(options = {})`

| Name                     | Type(s)                           | Description                                                                                            | Examples                                                                     |
|--------------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| `base`                   | `string`                          | prefixes all routes with this string                                                                   | `Router({ base: '/api' })`                                                   |
| `routes`                 | `array of routes`                 | array of manual routes for preloading                                                                  | [see documentation](https://itty.dev/itty-router/api#Router)                 |
| `schema`                 | `object`                          | Object of the common OpenAPI customizations                                                            | [see documentation](../advanced-user-guide/openapi-schema-customizations.md) |
| `docs_url`               | `string` or `null` or `undefined` | Path for swagger docs, `null`: disabled, `undefined`: `/docs`                                          | `/docs`                                                                      |
| `redoc_url`              | `string` or `null` or `undefined` | Path for redoc docs, `null`: disabled, `undefined`: `/redocs`                                          | `/redocs`                                                                    |
| `openapi_url`            | `string` or `null` or `undefined` | Path for openapi schema, `null`: disabled, `undefined`: `/openapi.json`                                | `/openapi.json`                                                              |
| `raiseUnknownParameters` | `boolean`                         | This will raise validation errors when an endpoint received an unknown query parameter                 | true                                                                         |
| `generateOperationIds`   | `boolean`                         | This will generate operation ids from class names for your endpoints when nothing is provided          | true                                                                         |
| `openapiVersion`         | `string`                          | Use this property to switch between the 3 and 3.1 OpenAPI specification, by default this will be `3.1` | `3.1`                                                                        |
| `aiPlugin`               | `object` or `undefined`           | Object that will be used to generate the `ai-plugin.json` schema                                       | [see schema bellow](#aiplugin)                                               |

## `aiPlugin`

Example configurations are [available here](../advanced-user-guide/openai-plugin.md)

| Name                    | Type(s)                                    | Description                                                              | Examples                                                                                                                                                                                                                   |
|-------------------------|--------------------------------------------|--------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `schema_version`        | `SchemaVersion` or `string` or `undefined` | Schema Version, `undefined`: defaults `v1`                               | `v1`                                                                                                                                                                                                                       |
| `name_for_model`        | `string`                                   | Name for model                                                           | `cloudflare_radar`                                                                                                                                                                                                         |
| `name_for_human`        | `string`                                   | Name for Human                                                           | `Cloudflare Radar API`                                                                                                                                                                                                     |
| `description_for_model` | `string`                                   | Description for model                                                    | `Plugin for retrieving the data based on Cloudflare Radar's data. Use it whenever a user asks something that might be related to Internet usage, eg. outages, Internet traffic, or Cloudflare Radar's data in particular.` |
| `description_for_human` | `string`                                   | Description for human                                                    | `Get data insights from Cloudflare's point of view.`                                                                                                                                                                       |
| `logo_url`              | `string`                                   | Logo url                                                                 | `https://cdn-icons-png.flaticon.com/512/5969/5969044.png`                                                                                                                                                                  |
| `contact_email`         | `string`                                   | Contact email                                                            | `radar@cloudflare.com`                                                                                                                                                                                                     |
| `legal_info_url`        | `string`                                   | Legal info url                                                           | `https://www.cloudflare.com/website-terms/`                                                                                                                                                                                |
| `auth`                  | `object` or `undefined`                    | Object for Auth configuration, `undefined`: defaults to no Auth          | `{type: AuthType.USER_HTTP, authorization_type: 'bearer'}`                                                                                                                                                                 |
| `api`                   | `object` or `undefined`                    | Object for Api configuration, `undefined`: defaults to openapi.json spec | `{type: APIType.OPENAPI, has_user_authentication: false, url: '/openai.json'}`                                                                                                                                             |


## Selecting a different OpenAPI version

By default itty-router-openapi generated OpenAPI 3.1 schemas, but you can revert back to 3.0 by updating your router configuration

```ts
const router = OpenAPIRouter({
    openapiVersion: '3',
})
```
