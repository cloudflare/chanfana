---
"chanfana": patch
---

Respect `maxPerPage` in `ListEndpoint` `per_page` validation and OpenAPI output. `maxPerPage` (default 100) and a new `defaultPerPage` (default 20) are now declared on `ListEndpoint` and inherited by `D1ListEndpoint`, so raising `maxPerPage` allows larger pages instead of returning a 400, and the documented `maximum` matches the configured limit. The default page size is capped at `maxPerPage`. Note: endpoints that lower `maxPerPage` below 100 now reject larger `per_page` values with a 400 instead of silently clamping them.
