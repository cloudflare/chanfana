Methods available:

- `getSchema();` this allows you to live change your openapi schema
- `async getObject(filters: Filters): Promise<O<typeof this.meta> | null>;` this parses the filters from the query and url parameters
- `async getObject(): Promise<O<typeof this.meta>>;` this receives the filters and returns the object that will be deleted
- `async before(oldObj: O<typeof this.meta>, filters: Filters): Promise<Filters>;` add custom logic before deleting the object, allows you to inject additional sql conditions
- `async after(data: O<typeof this.meta>): Promise<O<typeof this.meta>>;` add custom logic after deleting the object
- `async delete(oldObj: O<typeof this.meta>, filters: Filters): Promise<O<typeof this.meta> | null>;` deletes the object
- `async handle(...args);` overwrite the response or the order of the method calls

Call order:

```ts
async function handle(...args) {
  let filters = await this.getFilters();

  const oldObj = await this.getObject(filters);

  if (oldObj === null) {
    throw new NotFoundException();
  }

  filters = await this.before(oldObj, filters);

  let obj = await this.delete(oldObj, filters);

  if (obj === null) {
    throw new NotFoundException();
  }

  obj = await this.after(obj);

  return {
    success: true,
    result: this.meta.model.serializer(obj),
  };
}
```
  
Example router registration:
```ts
// Primary keys not present in the url are expected in the request body
router.delete("/gateways/:gateway_id/evaluations/:id", DeleteEvaluation);
```
  
## D1 Endpoint
The D1 delete adapter exposes 2 additional configuration:

- `dbName`: your D1 binding name, by default is set to "DB"
- `logger`: this allows you to get logger messages for validation errors, objects deleted and other;

Here is an example of a simple delete endpoint, using the example model defined in the [getting started with cruds example](./getting-started-with-cruds.md):
```ts
import { D1DeleteEndpoint } from 'chanfana'

export class DeleteEvaluation extends D1DeleteEndpoint {
  _meta = {
    model: evaluationModel
  };
}
```

## Bring your own Database Endpoint

In our to use Bring your own Database, just extend your class from the base `DeleteEndpoint` and overwrite the `delete` and `getObject` methods.

```ts
import { DeleteEndpoint } from 'chanfana'

export class MyCustomDelete extends DeleteEndpoint {
  async getObject(filters: Filters): Promise<O<typeof this.meta> | null> {
    // TODO: retreive my object using filters

    if (myObject ===undefined) {
      // if there is no object matching the filters, return null to throw a http 404
      return null;
    }

    // Object found, return it
    return myobject
  }
  
  async delete(oldObj: O<typeof this.meta>, filters: Filters): Promise<O<typeof this.meta> | null> {
    // the variable oldObj will contain the object from getObject

    // TODO: actually delete the object
    
    if (result.meta.changes === 0) {
      // If there were no sql changes, you can return null to throw a http 404
      return null;
    }
    
    // Return deleted object, this will be included in the endpoint response
    return oldObj;
  }
}
```
