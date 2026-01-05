# Changelog - Zod 4 UpdateEndpoint Fix

## [Unreleased]

### Fixed

#### UpdateEndpoint now correctly handles Zod 4 optional fields with defaults

**Issue:**
After upgrading to Zod 4, `UpdateEndpoint` would incorrectly reset optional fields to their default values even when those fields were not included in the update request. This was due to a breaking change in Zod 4 where optional fields with `.default()` are now always present in the parsed output, even when absent from the input.

**Example of the bug:**
```typescript
const UserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.email(),
  age: z.number().int().optional().default(18),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

// User in database: { id: 1, username: "john", email: "john@example.com", age: 30, status: "inactive" }

// Update request - only changing username:
PUT /users/1
{ "username": "johndoe", "email": "john@example.com" }

// ❌ Before fix: age would be reset to 18, status would be reset to "active"
// ✅ After fix: age remains 30, status remains "inactive"
```

**What changed:**
- Added `getUnvalidatedData()` method to `OpenAPIRoute` class that provides access to raw request data before Zod applies defaults and transformations
- Updated `UpdateEndpoint.getUpdatedData()` to check which fields were actually present in the raw request body
- Only fields explicitly sent in the request are now used to update the database object

**Impact:**
- ✅ **No breaking changes** - This is a bug fix that restores expected behavior
- ✅ **No action required** - Updates will automatically work correctly after upgrading
- ✅ **Partial updates work as expected** - Only fields you send will be updated
- ✅ **You can still explicitly set fields to default values** - If you send `age: 18`, it will be set to 18

**For custom endpoint implementations:**
If you've created custom endpoints that extend `OpenAPIRoute` and need to distinguish between fields that were sent vs. fields added by Zod defaults, you can now use:

```typescript
const rawData = await this.getUnvalidatedData();
// rawData.body contains the original request body before Zod processing
// rawData.params contains the URL parameters
// rawData.query contains the query parameters
// rawData.headers contains the headers

// Check if a field was actually sent:
if ('fieldName' in rawData.body) {
  // Field was present in the request
}
```

### Technical Details

**Root Cause:**
In Zod 3, optional fields with defaults were only populated if the field was present but invalid. In Zod 4, optional fields with defaults are **always** populated in the parsed output, even when completely absent from the input. This aligns with common expectations but required adjustments to partial update logic.

**Solution:**
The `UpdateEndpoint` now maintains a reference to the unvalidated request data and uses it to determine which fields were actually provided by the client, preventing Zod-applied defaults from overwriting existing database values during partial updates.

### Testing

Added comprehensive test coverage for Zod 4 behavior:
- ✅ Partial updates don't overwrite non-provided fields with defaults
- ✅ Explicitly setting fields to default values works correctly
- ✅ Optional fields without defaults are handled properly
- ✅ Empty update bodies don't reset fields to defaults
- ✅ Mixed partial updates work correctly

---

## Migration Notes for Zod 4

If you're upgrading to Chanfana with Zod 4 support, please review the [Zod 4 Migration Guide](./docs/migration-to-chanfana-3.md) for other breaking changes, including:

- **String format methods** - `z.string().email()` → `z.email()`
- **Native enums** - `z.nativeEnum()` → `z.enum()`
- **Error message formats** - Error messages are more descriptive
- **Parameter helpers** - Already updated in Chanfana (no action needed)

---

## Questions?

If you encounter any issues with update operations or Zod 4 behavior:
1. Check the [Troubleshooting FAQ](./docs/troubleshooting-and-faq.md)
2. Review the [Auto Endpoints documentation](./docs/endpoints/auto/base.md)
3. Open an issue on [GitHub](https://github.com/cloudflare/chanfana/issues)
