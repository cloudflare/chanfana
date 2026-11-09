---
"chanfana": minor
---

Align error responses with the Cloudflare API response guidelines.

Visible by default:

- Error responses formatted by chanfana now always return `result: null` instead of `result: {}`. Clients that check `result` for truthiness or expect it to be an object may be affected.
- JSON responses (including `openapi.json`) use `content-type: application/json`; the `;charset=UTF-8` suffix was dropped.

Additions:

- Exceptions accept an optional `documentation_url` (class property or `{ documentation_url }` constructor option, which takes precedence) that is included in each error object and documented in `schema()` when set on the class.
- New exported `ApiErrorObject` type describes the objects returned by `buildResponse()`.
