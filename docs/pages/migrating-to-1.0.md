## What changed

The 1.0 update is a big change from the previous version, mainly focusing on bringing support for 
[Zod](https://zod.dev) everywhere!

There are a lot of DX improvements and small issues fixed under the hood, but everything besides the breaking changes bellow
should not affect your day to day operations.

## Breaking changes

### Regex now must be in the RegExp format instead of string

Previously, Regex expressions for the `Regex` parameter type were strings, but now they are defined using the `RegExp` 
format.

To upgrade the old expressions, just replace the `'` you had before with `/`:

```ts title="Old version"
import { Regex } from '@cloudflare/itty-router-openapi'
const param = new Regex('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
```

```ts title="New version"
import { Regex } from '@cloudflare/itty-router-openapi'
const param = new Regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
```

---

### Validation errors format is now different

Previously, validation errors gave very little information, about what was wrong and where it was wrong.

Here's an example of a failing enum validation previously:

```json title="Old Version"
{
  "errors": {
    "product": "is not one of available options"
  },
  "success": false,
  "result": {}
}
```

Here's an example of the same request, but running on the newer itty-router-openapi version

```json title="New Version"
{
  "errors": [
    {
      "received": "testing",
      "code": "invalid_enum_value",
      "options": [
        "http",
        "all",
        ""
      ],
      "path": [
        "query",
        "product",
        0
      ],
      "message": "Invalid enum value. Expected 'http' | 'all' | '', received 'testing'"
    }
  ],
  "success": false,
  "result": {}
}
```

As you can see, now we get much more information about what type of validation failed, the path to that field in the
request, and available options.

---

### raiseUnknownParameters now default to true

The `raiseUnknownParameters` flag was introduced recently as a way to make the api more strict during validation.
It works but raising an error every time an endpoint receives an unexpected parameter.

Until now this flag was opt-in, in order to not break any existing application, but we took this
1.0 opportunity to turn it on by default.

You can still disable it in the `Router` configurations, read more [here](user-guide/router-options.md).

---

### Query and path parameters each now have its own object inside the data argument

Until now the `query` and `path` parameters were at the root of the `data` argument.

```ts title="Old version""

export class TaskList extends OpenAPIRoute {
  static schema = {
    parameters: {
      slug: Path(String),
      page: Query(Int),
    },
  }

  async handle(request: Request, env: any, context: any, data: object) {
    // Retrieve the validated page
    const { page, slug } = data
    
    // ...
  }
}
```

This caused some confusion, on why are these fields at the root, and body fields are inside the `body` property?
It was also impossible to get a path and a query parameter with the same name.

In the new version we moved the path to the `params` property and the query to the `query` property
of the data object.


```ts title="New version""
export class TaskList extends OpenAPIRoute {
  static schema = {
    parameters: {
      slug: Path(String),
      page: Query(Int),
    },
  }

  async handle(request: Request, env: any, context: any, data: object) {
    // Retrieve the validated page
    const { page } = data.query
    const { slug } = data.path
    
    // ...
  }
}
```

---

### Missing optional parameters will also be missing in the validated data object

Previously, when a parameter was optional, and you didn't sent it in the request, it would always be
set to `null` in the data object.

This was a problem to differentiate when a parameter was optional, but you actually sent it with a value of
`null`.

In the new version, optional parameters that are not sent will be left undefined, so now you **need to check**
the parameter is defined before using it.
