---
"chanfana": patch
---

Keep generated operationIds unique when endpoint classes share a name. A route whose class name is already used by another route now falls back to a path-based operationId, so Swagger UI no longer runs the wrong endpoint.

Explicit `operationId` values take precedence: when one matches an id that was generated for an earlier route, the earlier route is given a new path-based id instead. Two explicit `operationId` values that collide are kept as-is and a warning is logged. Routes from nested routers are checked against the parent router too, so sub-routers reusing a class name no longer produce duplicate ids. Because collisions are resolved as routes are registered, a generated id can depend on registration order.
