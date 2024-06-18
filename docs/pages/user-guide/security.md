For this page you **must** have some knowledge of how security works in OpenAPI, read more
[here](https://swagger.io/docs/specification/authentication/).

Please notice that security in chanfana is only for schema generation, if you want to
add some kind of authentication, please read more in the [middleware page](./middleware.md)!

## Register the security component

The first step into security is to register your security component in your main router. 

Here's a simple Bearer token example:

```ts
const app = new Hono()
const openapi = fromHono(app)

openapi.registry.registerComponent(
  'securitySchemes',
  'BearerAuth',
  {
    type: http,
    scheme: bearer,
  },
)
```

From this point onward you can either make all endpoints require security or apply the security requirement only in some
endpoints.

## All endpoints require security

For this add the `security` component to your main `router` schema customization field

Notice that the key used in security must be the same used to register the component
```ts hl_lines="5 13"
const app = new Hono()
const openapi = fromHono(app, {
  schema: {
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
})

router.registry.registerComponent(
  'securitySchemes',
  'BearerAuth',
  {
    type: http,
    scheme: bearer,
  },
)
```


## Some endpoints require security

For this add the `security` component to your main `endpoint` schema customization field

Notice that the key used in security must be the same used to register the component
```ts hl_lines="14 26"
export class ScanMetadataCreate extends OpenAPIRoute {
  schema = {
    tags: ['Scans'],
    summary: 'Create Scan metadata',
    request: {
      body: z.object({
        scan_id: Uuid,
        url: z.string().url(),
        destination_ip: z.string().ip(),
        timestamp: z.string().datetime(),
        console_logs: z.string().array(),
      })
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  }

  // ...
}

const app = new Hono()
const openapi = fromHono(app)

openapi.registry.registerComponent(
  'securitySchemes',
  'BearerAuth',
  {
    type: http,
    scheme: bearer,
  },
)

openapi.post('/scan/metadata/', ScanMetadataCreate)
```

For more informations on how to setup security read the OpenAPI spec 
[here](https://swagger.io/docs/specification/authentication/).
