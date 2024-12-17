chanfana now has built-in classes for the common CRUD operation.

This allows you to get your work done faster, just create a new class that extends the operation you want and define your model.

Currently, there is support for `D1 Databases` and `Bring your own database`.

## Model definition
A chanfana model is compose of the following fields:

- `tableName`: the target table name
- `schema`: a Zod object containing all your database fields
- `primaryKeys`: an array of the primary keys of your table, this is used for updated, deletes and other operations
- `serializer`: optionally, a serializer function, this is useful when you don't want to show all fields in the response or convert something
- `serializerSchema`: optionally, the Zod schema output of the serializer function defined above

Start by defining your database model in this format:
```ts
export const Model = {
  tableName: string,
  schema: AnyZodObject,
  primaryKeys: Array<string>,
  serializer: (obj: object) => object, // Optional
  serializerSchema: AnyZodObject, // Optional
};
```

!!! note

    You will be able to customize what fields are applied to each operation inside each endpoint class


Here's an example model
```ts
import { z } from "zod";

export function EvaluationSerializer(obj) {
  return {
    id: obj.id,
    gateway_id: obj.gateway_id,
    name: obj.name,
    processed: Boolean(obj.processed),
    total_logs: obj.total_logs,
    created_at: obj.created_at,
    modified_at: obj.modified_at,
  };
}

export const evaluation = z.object({
  id: z.string(),
  gateway_id: z.string(),
  name: z.string(),
  created_at: z.string().datetime(),
  modified_at: z.string().datetime(),
  processed: z.boolean(),
  total_logs: z.number(),
});

export const evaluationModel = {
  schema: evaluation,
  primaryKeys: ["id", "gateway_id"],
  tableName: "evaluations",
  serializer: EvaluationSerializer,
  serializerSchema: evaluation
    .pick({
      id: true,
      gateway_id: true,
      name: true,
      processed: true,
      total_logs: true,
      results: true,
      created_at: true,
      modified_at: true,
    })
};
```

Learn more about each operation here:

- [create endpoint](./create-endpoint.md)
- [read endpoint](./read-endpoint.md)
- [update endpoint](./update-endpoint.md)
- [delete endpoint](./delete-endpoint.md)
- [list endpoint](./list-endpoint.md)
