The create class, allows you to specify witch fields the user is able to submit, you can set this in the `fields` parameter of the `_meta` variable.

Methods available:

- `getSchema();` this allows you to live change your openapi schema
- `async getObject(): Promise<O<typeof this.meta>>;` this allows you to customize the object after validation
- `async before(data: O<typeof this.meta>): Promise<O<typeof this.meta>>;` add custom logic before creating the object
- `async create(data: O<typeof this.meta>): Promise<O<typeof this.meta>>;` create the object in the database
- `async after(data: O<typeof this.meta>): Promise<O<typeof this.meta>>;` add custom logic after creating the object
- `async handle(...args);` overwrite the response or the order of the method calls

Call order:

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
  
Example router registration:
```ts
// Primary keys not present in the url are expected in the request body
router.post("/gateways/:gateway_id/evaluations", CreateEvaluation);
```


## D1 Endpoint
The D1 create adapter exposes 3 additional configuration:

- `dbName`: your D1 binding name, by default is set to "DB"
- `logger`: this allows you to get logger messages for validation errors, objects created and other;
- `constraintsMessages`: this allows you to customize database constraint error messages

Here is an example of a simple create endpoint, using the example model defined in the [getting started with cruds example](./getting-started-with-cruds.md):
```ts
import { D1CreateEndpoint } from 'chanfana'

export class CreateEvaluation extends D1CreateEndpoint {
  _meta = {
    model: evaluationModel,
    fields: evaluationModel.schema
      .pick({
        gateway_id: true,
        name: true,
      })
  };
}
```

### Customizing constraints messages
In order to have custom error messages for database constraint error, just define the field inside your class
with an object where the key is a comma separated list of the fields in the constraint and the value is a exception of the type

```ts
import { D1CreateEndpoint, InputValidationException } from 'chanfana'

export class CreateEvaluation extends D1CreateEndpoint {
  _meta = {...}
  
  constraintsMessages = {
    "evaluations.name, evaluations.gateway_id": new InputValidationException(
      "An object with this name already exists",
      ["body", "name"],
    ),
  };
}
```

## Bring your own Database Endpoint

In our to use Bring your own Database, just extend your class from the base `CreateEndpoint` and overwrite the `create` method.

```ts
import { CreateEndpoint } from 'chanfana'

export class MyCustomCreate extends CreateEndpoint {
  async create(data: O<typeof this.meta>): Promise<O<typeof this.meta>> {
    // TODO: insert my object here, data is already validated

    // Return the insert object
    return data;
  }
}
```
