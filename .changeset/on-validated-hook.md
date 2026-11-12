---
"chanfana": minor
---

Add an `onValidated(data, ...args)` hook to `OpenAPIRoute`. Override it to run reusable pre-handle logic, such as authorization or business rules, on the validated request data. It runs after validation and before `handle()`, is skipped when validation fails, and can throw an `ApiException` to return an error response. Routes that do not override it keep the current lazy validation.

If one of your endpoint classes already has a method named `onValidated`, chanfana now calls it before `handle()` with `(validatedData, ...routerArgs)`, and TypeScript may report an incompatible override. Rename that method to keep the previous behavior.
