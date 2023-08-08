## OpenAI plugin support

In the `aiPlugin` field you can define all fields from
the [plugin manifest](https://platform.openai.com/docs/plugins/getting-started)

This library include default values for the following plugin manifest fields:

```ts
import { AuthType, SchemaVersion, APIType } from '@cloudflare/itty-router-openapi'

const default = {
  schema_version: SchemaVersion.V1,
  auth: {
    type: AuthType.NONE,
  },
  api: {
    type: APIType.OPENAPI,
    has_user_authentication: false,
    url: '/openai.json', // The path to the schema will be the same as the `openapi_url` field in the router configuration
  }
}
```

Taking into consideration the default values included, we can build a very minimal configuration, assuming the api
doesn't require Auth:

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter({
  aiPlugin: {
    name_for_human: 'Cloudflare Radar API',
    name_for_model: 'cloudflare_radar',
    description_for_human: "Get data insights from Cloudflare's point of view.",
    description_for_model:
      "Plugin for retrieving the data based on Cloudflare Radar's data. Use it whenever a user asks something that might be related to Internet usage, eg. outages, Internet traffic, or Cloudflare Radar's data in particular.",
    contact_email: 'radar@cloudflare.com',
    legal_info_url: 'https://www.cloudflare.com/website-terms/',
    logo_url: 'https://cdn-icons-png.flaticon.com/512/5969/5969044.png',
  },
})

// ...
```

Now when calling the `/.well-known/ai-plugin.json` path in our worker, we will see a full ai-plugin schema, that
automatically points to our generated OpenAPI 3 Schema.

### Serving the OpenAI schema from multiple domains/hosts

When serving from multiple domains, the OpenAPI schema should automatically update to the domain being served.

Thats why we made the `aiPlugin.api.url` to allow relative paths, and when doing so, the itty-router-openapi will
automatically fill the domain.

```ts
import { OpenAPIRouter } from '@cloudflare/itty-router-openapi'

const router = OpenAPIRouter({
  aiPlugin: {
    // other fields
    api: {
      url: '/my-schema-for-openai.json',
    },
  },
})

// ...
```

Then when calling for `https://example.com/.well-known/ai-plugin.json` the response will have the absolut url

```
{
  ...
  api: {
    url: 'https://example.com/my-schema-for-openai.json'
  }
}
```
