---
"chanfana": patch
---

Keep generated operationIds unique when endpoint classes share a name. A route whose class name is already used by another route now falls back to a path-based operationId, so Swagger UI no longer runs the wrong endpoint.
