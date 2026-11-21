---
"chanfana": patch
---

Document Hono path parameters that have a regex pattern, such as `/posts/:id{[0-9]+}`, as `/posts/{id}` in the generated OpenAPI schema. The pattern was left in the documented path, which then had a template expression with no matching parameter.
