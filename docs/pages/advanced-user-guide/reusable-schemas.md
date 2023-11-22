# Reusable Schemas

Before continuing, please learn more about [Reusing Descriptions by OpenAPI](https://learn.openapis.org/specification/components.html).

To start reusing your schemas, all you need to do is call the `.openapi("schema name here")` after any schema you have
defined. This includes `parameters`, `requestBody`, `responses` even `Enum`.

!!! note

    This is only available when using [itty-router-openapi types](../types.md#itty-router-openapi-types) or 
    [zod types](../types.md#zod-types)


```ts
export class PutMetadata extends OpenAPIRoute {
  static schema: OpenAPIRouteSchema = {
    operationId: 'post-bucket-put-object-metadata',
    tags: ['Buckets'],
    summary: 'Update object metadata',
    parameters: {
      bucket: Path(String),
      key: Path(z.string().describe('base64 encoded file key')),
    },
    requestBody: z.object({
      customMetadata: z.record(z.string(), z.any())
    }).openapi("Object metadata")
  }
  
  // ...
}
```

Then when running the server, it would get rendered like this:

![Reusable Parameters](https://raw.githubusercontent.com/cloudflare/itty-router-openapi/main/docs/images/reusable-parameters.png)

The OpenAPI spec will also reflect this, by moving the schemas out of the endpoint and into the `components`:

```json
{
  "components": {
    "schemas": {
      "Object metadata": {
        "type": "object",
        "properties": {
          "customMetadata": {
            "type": "object",
            "additionalProperties": {}
          }
        },
        "required": [
          "customMetadata"
        ]
      }
    }
  }
}
```

Inside the endpoint schema, the reusable parameter is referenced by the name:

```json
{
  "paths": {
    "post": {
      "operationId": "post-bucket-put-object-metadata",
      "tags": [
        "Buckets"
      ],
      "summary": "Update object metadata",
      "parameters": [],
      "requestBody": {
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Object metadata"
            }
          }
        }
      },
      "responses": {}
    }
  }
}
}

```
