---
"chanfana": patch
---

Leave missing request headers out of the validated data, so headers declared with `.optional()` or `.default()` no longer fail with a 400 when the client does not send them.
