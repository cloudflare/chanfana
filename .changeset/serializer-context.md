---
"chanfana": minor
---

Add `SerializerContext` parameter to auto endpoint serializer function, providing access to filters and options for context-aware serialization.

The serializer signature changes from `(obj: object) => object` to `(obj: object, context?: SerializerContext) => object`. The `SerializerContext` type contains:

- `filters` — `Array<FilterCondition>`: the active filter conditions for the current request
- `options` — pagination and ordering options (`page`, `per_page`, `order_by`, `order_by_direction`)

**Context passed per endpoint type:**

| Endpoint | Context |
|---|---|
| `ListEndpoint` / `ReadEndpoint` | `{ filters, options }` |
| `UpdateEndpoint` / `DeleteEndpoint` | `{ filters }` |
| `CreateEndpoint` | `{ filters: [] }` |

```typescript
const meta = {
  model: {
    schema: UserSchema,
    primaryKeys: ["id"],
    tableName: "users",
    serializer: (obj: any, context?: SerializerContext) => {
      const hasRoleFilter = context?.filters?.some(f => f.field === "role");
      // Conditionally include fields based on active filters
      return hasRoleFilter ? obj : omit(obj, ["role"]);
    },
  },
};
```

**New exports:**
- `SerializerContext` — type for the serializer's second parameter
