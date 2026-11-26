---
"chanfana": patch
---

Drop Hono regex constraints from path parameters in the OpenAPI schema, so a route like `/posts/:id{[0-9]+}` is documented as `/posts/{id}` instead of `/posts/{id}{[0-9]+}`. Generated operationIds for these routes no longer include the regex either.

This is a visible change in generated schemas for routes with a regex constraint: their path keys and generated operationIds change (for example `get_posts_id[0-9]+` becomes `get_posts_id`). Explicit `operationId` values are kept. Two routes that differ only in the regex, like `/posts/:id{[0-9]+}` and `/posts/:id{[a-z]+}`, now map to the same OpenAPI path and method, so only the one registered last is documented.
