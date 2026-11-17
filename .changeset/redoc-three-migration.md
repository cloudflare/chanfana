---
"chanfana": minor
---

Upgrade the bundled documentation page from Redoc 2.1.5 to Redoc 3.1.0, loading the pinned CDN bundle as an ES module with updated subresource integrity.

Redoc 3 changes the documentation layout, deep links, and supported configuration options. Update `redoc_options` using the Redoc migration guide: https://redocly.com/docs/redoc/config-migration. For example, `disable-search` was removed, `hide-download-button` became `hide-download-buttons`, and `json-sample-expand-level` became `json-samples-expand-level`. Legacy options are passed through without translation.

Disable Redoc telemetry by default. To enable it explicitly, set `redoc_options: { "disable-telemetry": false }` or pass the same option to `getReDocUI()`.
