## Accessing url parameters from the class schema

You can now get a list of url parameters inside the getSchema function.
This can be very helpful when auto generating schemas

```ts
import { OpenAPIRoute } from './route'

// Define route
router.get("/v1/:account_id/gateways/:gateway_id", GetGateway);

export class GetAccountStats extends OpenAPIRoute {
	getSchema() {
    console.log(this.params.urlParams)
     
    // The line above will print this: ["account_id", "gateway_id"]
    // You can use this to manipulate the schema, adding or removing fields
    
		return this.schema
	}
};
```
