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

The following internal utility functions have been removed from the public API as they relied on Zod's internal APIs:

- `isAnyZodType()`
- `isSpecificZodType()`

If you were using these functions, you should use Zod v4's public APIs instead:

```typescript
// Before
import { isAnyZodType } from 'chanfana';
if (isAnyZodType(schema)) { ... }

// After
import { z } from 'zod';
if (schema instanceof z.ZodType) { ... }
```

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

### 2. Update Error Message Handling (If Applicable)

If your code depends on specific error message formats (e.g., for testing or client-side validation display), update those expectations to match the new Zod v4 formats shown above.

### 3. Test Your Application

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
