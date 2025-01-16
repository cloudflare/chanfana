# Create Endpoint

The Create endpoint allows you to generate API endpoints for creating new resources based on your model definition. You can specify which fields users are allowed to submit through the endpoint.

## Base Configuration

To define a Create endpoint, extend one of the base classes (`CreateEndpoint` for custom databases or `D1CreateEndpoint` for D1) and configure the `_meta` object:

```ts
export class CreateEvaluation extends D1CreateEndpoint {
  _meta = {
    model: evaluationModel,
    fields: evaluationModel.schema.pick({
      gateway_id: true,
      name: true,
    })
  };
}
```

## Available Methods

You can customize the Create endpoint behavior by overriding these methods:

- `getSchema()`: Customize the OpenAPI schema at runtime
- `async getObject()`: Transform or enhance the object after validation
- `async before(data)`: Add custom logic before creating the object
- `async create(data)`: Create the object in the database
- `async after(data)`: Add custom logic after creating the object
- `async handle(...args)`: Override the default execution flow

## Execution Flow

By default, the Create endpoint follows this execution order:

```ts
async function handle(...args) {
  let obj = await this.getObject();
  obj = await this.before(obj);
  obj = await this.create(obj);
  obj = await this.after(obj);

  return {
    success: true,
    result: this.meta.model.serializer(obj as object),
  };
}
```

## Route Registration

Register your Create endpoint like any other route. Primary keys not present in the URL are expected in the request body:

```ts
router.post("/gateways/:gateway_id/evaluations", CreateEvaluation);
```

## Database Adapters

### D1 Adapter

The `D1CreateEndpoint` provides built-in support for Cloudflare D1. Configure it with these options:

```ts
import { D1CreateEndpoint } from 'chanfana'

export class CreateEvaluation extends D1CreateEndpoint {
  _meta = {
    model: evaluationModel,
    fields: evaluationModel.schema.pick({
      gateway_id: true,
      name: true,
    })
  };

  // Optional configurations
  dbName = "DB";  // D1 binding name (defaults to "DB")
  logger = true;  // Enable logging for validation errors and operations
}
```

#### Custom Constraint Messages

Customize database constraint violation messages by defining the `constraintsMessages` object:

```ts
import { D1CreateEndpoint, InputValidationException } from 'chanfana'

export class CreateEvaluation extends D1CreateEndpoint {
  _meta = {
    // ... configuration as above
  };
  
  constraintsMessages = {
    "evaluations.name, evaluations.gateway_id": new InputValidationException(
      "An object with this name already exists",
      ["body", "name"],
    ),
  };
}
```

### Bring your own Database Adapter

For databases other than D1, extend the base `CreateEndpoint` class and implement the `create` method:

```ts
import { CreateEndpoint } from 'chanfana'

export class MyCustomCreate extends CreateEndpoint {
  async create(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
    // Implement your database insertion logic here
    // The 'data' parameter contains the validated object

    return data; // Return the created object
  }
}
```

## Related Resources
- [Getting Started with CRUDS](./getting-started-with-cruds.md)

