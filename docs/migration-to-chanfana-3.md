# Migration Guide: Zod v4

This guide helps you migrate from chanfana with Zod v3 to chanfana with Zod v4. Chanfana now supports Zod v4, bringing improved tree-shakeability and better performance to your API projects.

## What Changed

Chanfana has been updated to use Zod v4 and `@asteasolutions/zod-to-openapi` v8. While most of the chanfana API remains the same, there are some important changes to be aware of.

## Breaking Changes

### Error Message Formats

Zod v4 improved error messages to be more descriptive and consistent. If your application parses or depends on specific error message formats, you'll need to update them.

**Common changes:**

- `"Required"` → `"Invalid input: expected <type>, received undefined"`
- `"Expected number, received nan"` → `"Invalid input: expected number, received NaN"`
- `"Invalid email"` → `"Invalid email address"`
- `"Invalid uuid"` → `"Invalid UUID"` (capitalization)
- `"Invalid ip"` → `"Invalid IPv4 address"` or `"Invalid IPv6 address"` (more specific)
- Enum errors now use format: `'Invalid option: expected one of "option1"|"option2"'`

**Example:**

```typescript
// Before (Zod v3)
{
  "code": "invalid_type",
  "message": "Required",
  "path": ["username"]
}

// After (Zod v4)
{
  "code": "invalid_type",
  "message": "Invalid input: expected string, received undefined",
  "path": ["username"]
}
```

### Error Object Structure

The `received` field may no longer be present in some error objects. If your code relies on this field, you should update it to handle cases where it's absent.

## Changes Required for Custom Zod Schemas

If you're using Zod directly in your schemas (not through chanfana's parameter helpers), you'll need to update deprecated string format methods:

### String Format Methods (BREAKING)

Zod v4 moved string format validations to top-level functions for better tree-shakeability:

```typescript
// Before (Zod v3)
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  website: z.string().url(),
  birthDate: z.date(), // For date-only strings like "2024-01-20"
});

// After (Zod v4)
import { z } from 'zod';

const schema = z.object({
  email: z.email(),              // Top-level function
  userId: z.uuid(),              // Top-level function
  createdAt: z.iso.datetime(),   // Under z.iso namespace
  website: z.url(),              // Top-level function
  birthDate: z.iso.date(),       // Under z.iso namespace for YYYY-MM-DD strings
});
```

**Common replacements:**
- `z.string().email()` → `z.email()`
- `z.string().uuid()` → `z.uuid()`
- `z.string().url()` → `z.url()`
- `z.string().datetime()` → `z.iso.datetime()`
- `z.date()` (for date strings) → `z.iso.date()`
- `z.string().ipv4()` → `z.ipv4()`
- `z.string().ipv6()` → `z.ipv6()`

**Note:** If you're using chanfana's parameter helpers like `Email()`, `Uuid()`, `DateTime()`, `DateOnly()`, etc., these have already been updated internally and require no changes from you.

### Native Enums (BREAKING)

Zod v4 consolidated enum handling. If you're using `z.nativeEnum()`, switch to `z.enum()`:

```typescript
// Before (Zod v3)
enum Status {
  Active = 'active',
  Inactive = 'inactive',
}

const schema = z.object({
  status: z.nativeEnum(Status),
});

// After (Zod v4)
const schema = z.object({
  status: z.enum(Status), // Or use array: z.enum(['active', 'inactive'])
});
```

## Bug Fixes

### UpdateEndpoint and Optional Fields with Defaults

**Fixed in this release:**
Zod 4 changed how optional fields with `.default()` values are handled. Previously in Zod 3, defaults were only applied if a field was present but invalid. In Zod 4, defaults are **always applied** even when the field is absent from the input.

This caused an issue where `UpdateEndpoint` would incorrectly reset optional fields to their default values during partial updates, even when those fields weren't included in the update request.

**Example:**
```typescript
const UserSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.email(),
  age: z.number().int().optional().default(18),
});

// Database record: { id: 1, username: "john", age: 30 }

// Update only username:
PUT /users/1
{ "username": "johndoe", "email": "john@example.com" }

// ✅ Correctly keeps age as 30 (not reset to default 18)
```

**What we fixed:**
- `UpdateEndpoint` now checks the raw request body to determine which fields were actually sent
- Only fields present in the request are used to update the record
- This preserves existing values for fields not included in partial updates

**No action required** - This fix is automatic and restores the expected behavior for partial updates.

## Non-Breaking Changes

### IP Validation (Internal Only)

Chanfana's `Ipv4()`, `Ipv6()`, and `Ip()` parameter helpers have been updated to use Zod v4's new top-level IP validation functions. This is an internal change that improves tree-shakeability, but the API remains the same.

**You don't need to change anything in your code** - these helpers work exactly as before:

```typescript
import { Ipv4, Ipv6, Ip } from 'chanfana';

// All of these still work the same way
const ipv4Schema = Ipv4({ description: 'IPv4 address' });
const ipv6Schema = Ipv6({ description: 'IPv6 address' });
const anyIpSchema = Ip({ description: 'IPv4 or IPv6 address' });
```

## Removed Exports

The following items have been removed from the public API:

**Utility Functions** (relied on Zod's internal APIs):
- `isAnyZodType()`
- `isSpecificZodType()`

**Type Aliases** (unnecessary abstraction over Zod v4 types):
- `ZodEffects<T, Output, Input>` - Use `ZodPipe<T, any>` from Zod directly instead

If you were using these, you should use Zod v4's public APIs instead:

```typescript
// isAnyZodType replacement
// Before
import { isAnyZodType } from 'chanfana';
if (isAnyZodType(schema)) { ... }

// After
import { z } from 'zod';
if (schema instanceof z.ZodType) { ... }

// ZodEffects replacement
// Before
import type { ZodEffects } from 'chanfana';
type MyParam = ZodEffects<SomeSchema, Output, Input>;

// After
import type { ZodPipe } from 'zod';
type MyParam = ZodPipe<SomeSchema, any>;
```

**Note:** `AnyZodObject` remains exported as it's a commonly used type in the public API.

## Migration Steps

### 1. Update Dependencies

Update your `package.json`:

```json
{
  "dependencies": {
    "chanfana": "^2.8.3", // or latest
    "zod": "^4.0.0"
  }
}
```

Then run:

```bash
npm install
```

### 2. Update Deprecated Zod Methods (If Using Custom Schemas)

If you're using Zod directly in your schemas, search for and replace deprecated string format methods:

```bash
# Search for patterns that need updating
grep -r "z\.string()\.\.email\|uuid\|datetime\|url" .
grep -r "z\.nativeEnum" .
```

Update according to the "Changes Required for Custom Zod Schemas" section above.

### 3. Update Error Message Handling (If Applicable)

If your code depends on specific error message formats (e.g., for testing or client-side validation display), update those expectations to match the new Zod v4 formats shown above.

### 4. Test Your Application

Run your test suite to catch any issues:

```bash
npm test
```

Pay special attention to:
- Validation error handling tests
- API response format tests
- Error message assertions

## Benefits of Zod v4

After migrating, you'll benefit from:

- **Better Tree-Shakeability:** Smaller bundle sizes thanks to improved code splitting
- **Improved Error Messages:** More descriptive and consistent validation errors
- **Better Performance:** Optimized validation logic
- **Enhanced Type Safety:** Improved TypeScript inference

## Need Help?

If you encounter issues during migration:

1. Check the [Troubleshooting FAQ](/troubleshooting-and-faq)
2. Review the [Zod v4 changelog](https://zod.dev/v4/changelog)
3. Open an issue on [GitHub](https://github.com/cloudflare/chanfana/issues)
