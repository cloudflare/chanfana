---
"chanfana": minor
---

Add customizable pagination and ordering parameter names to ListEndpoint via `pageFieldName`, `perPageFieldName`, `orderByFieldName`, and `orderByDirectionFieldName` class properties.

**Breaking change for subclasses overriding `optionFields`:** `optionFields` is now a computed getter derived from the four `*FieldName` properties. Subclasses that previously overrode `optionFields` directly should instead override the individual field name properties.
