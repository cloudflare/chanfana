---
"chanfana": patch
---

Document a route registered at `/` under the `/` path in the generated OpenAPI schema. It was listed under an empty path, which is not a valid OpenAPI path.

This is a visible change in generated schemas: if you relied on the `""` path key (e.g. in snapshots or client generators), you will now see `/`. Root routes of nested routers are documented at the mount path, without a trailing slash.
