---
"chanfana": minor
---

Add an `onValidated(data, ...args)` hook to `OpenAPIRoute`. Override it to run reusable pre-handle logic, such as authorization or business rules, on the validated request data. It runs after validation and before `handle()`, is skipped when validation fails, and can throw an `ApiException` to return an error response. Routes that do not override it keep the current lazy validation.
