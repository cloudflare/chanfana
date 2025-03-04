# Parameters: Defining Input Types in Detail

Chanfana provides a rich set of parameter types to define the inputs of your API endpoints, ensuring data validation and clear OpenAPI documentation. These parameter types are used within your Zod schemas to specify the expected format and constraints for request body fields, query parameters, path parameters, and headers.

## Introduction to Parameter Types

Chanfana's parameter types are essentially wrappers around Zod schema types, enhanced with OpenAPI metadata and convenience methods. They are designed to simplify the process of defining API inputs and generating accurate OpenAPI specifications.

You can find these parameter types in the `chanfana` library:

```typescript
import {
    Str, Num, Int, Bool, DateTime, DateOnly, Regex, Email, Uuid, Hostname, Ipv4, Ipv6, Ip, Enumeration, Arr, Obj
} from 'chanfana';
```

Let's explore each parameter type in detail.

## Core Parameter Types

These are fundamental parameter types for common data types.

### `Str`: Strings

The `Str` parameter type represents string inputs. It's based on `z.string()` from Zod.

**Usage:**

```typescript
import { Str } from 'chanfana';
import { z } from 'zod';

const nameSchema = Str({
    description: 'User\'s name',
    minLength: 3,
    maxLength: 50,
    example: 'John Doe',
});

// nameSchema is a ZodString with OpenAPI metadata
```

**Options:**

*   **`description`:** Description for OpenAPI documentation.
*   **`required`:** (boolean, default: `true`) Whether the parameter is required.
*   **`default`:** Default value for the parameter.
*   **`example`:** Example value for OpenAPI documentation.
*   **`minLength`:** Minimum string length.
*   **`maxLength`:** Maximum string length.
*   **`format`:** OpenAPI format (e.g., "date", "date-time", "password").

### `Num`: Numbers

The `Num` parameter type represents floating-point number inputs. It's based on `z.number()` from Zod.

**Usage:**

```typescript
import { Num } from 'chanfana';
import { z } from 'zod';

const priceSchema = Num({
    description: 'Product price',
    minimum: 0,
    exclusiveMinimum: true,
    example: 99.99,
});
```

**Options:**

*   All options from `Str` (except string-specific options like `minLength`, `maxLength`).
*   **`minimum`:** Minimum allowed value.
*   **`maximum`:** Maximum allowed value.
*   **`exclusiveMinimum`:** (boolean) If `true`, the value must be strictly greater than `minimum`.
*   **`exclusiveMaximum`:** (boolean) If `true`, the value must be strictly less than `maximum`.
*   **`multipleOf`:** Value must be a multiple of this number.

### `Int`: Integers

The `Int` parameter type represents integer number inputs. It's based on `z.number().int()` from Zod.

**Usage:**

```typescript
import { Int } from 'chanfana';
import { z } from 'zod';

const ageSchema = Int({
    description: 'User\'s age',
    minimum: 0,
    maximum: 120,
    example: 30,
});
```

**Options:**

*   Same options as `Num`.

### `Bool`: Booleans

The `Bool` parameter type represents boolean inputs (`true` or `false`). It's based on `z.boolean()` from Zod.

**Usage:**

```typescript
import { Bool } from 'chanfana';
import { z } from 'zod';

const isActiveSchema = Bool({
    description: 'User active status',
    default: true,
    example: true,
});
```

**Options:**

*   All options from `Str` (except string-specific options).

### `DateTime`: Date and Time Strings

The `DateTime` parameter type represents date and time strings in ISO 8601 format (e.g., "2024-01-20T10:30:00Z"). It's based on `z.string().datetime()` from Zod.

**Usage:**

```typescript
import { DateTime } from 'chanfana';
import { z } from 'zod';

const createdAtSchema = DateTime({
    description: 'Date and time of creation',
    example: '2024-01-20T10:30:00Z',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "date-time" in OpenAPI.

### `DateOnly`: Date Strings

The `DateOnly` parameter type represents date strings in YYYY-MM-DD format (e.g., "2024-01-20"). It's based on `z.date()` from Zod, which is then formatted as a string.

**Usage:**

```typescript
import { DateOnly } from 'chanfana';
import { z } from 'zod';

const birthDateSchema = DateOnly({
    description: 'User\'s birth date',
    example: '1990-05-15',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "date" in OpenAPI.

## Specialized String Parameter Types

These parameter types are specialized versions of `Str` for specific string formats.

### `Regex`: Regular Expression Matching Strings

The `Regex` parameter type represents strings that must match a given regular expression pattern. It's based on `z.string().regex()` from Zod.

**Usage:**

```typescript
import { Regex } from 'chanfana';
import { z } from 'zod';

const passwordSchema = Regex({
    description: 'Password (must contain at least one uppercase, one lowercase, and one number)',
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    patternError: 'Password must meet complexity requirements',
});
```

**Options:**

*   All options from `Str`.
*   **`pattern`:** (RegExp) The regular expression pattern to match.
*   **`patternError`:** (string, optional) Custom error message if the pattern doesn't match.

### `Email`: Email Address Strings

The `Email` parameter type represents strings that must be valid email addresses. It's based on `z.string().email()` from Zod.

**Usage:**

```typescript
import { Email } from 'chanfana';
import { z } from 'zod';

const emailSchema = Email({
    description: 'User\'s email address',
    example: 'user@example.com',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "email" in OpenAPI.

### `Uuid`: UUID Strings

The `Uuid` parameter type represents strings that must be valid UUIDs (Universally Unique Identifiers). It's based on `z.string().uuid()` from Zod.

**Usage:**

```typescript
import { Uuid } from 'chanfana';
import { z } from 'zod';

const userIdSchema = Uuid({
    description: 'User ID (UUID format)',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "uuid" in OpenAPI.

### `Hostname`: Hostname Strings

The `Hostname` parameter type represents strings that must be valid hostnames. It's based on `z.string().regex()` with a hostname pattern from Zod.

**Usage:**

```typescript
import { Hostname } from 'chanfana';
import { z } from 'zod';

const websiteSchema = Hostname({
    description: 'Website hostname',
    example: 'www.example.com',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "hostname" in OpenAPI.

### `Ipv4`: IPv4 Address Strings

The `Ipv4` parameter type represents strings that must be valid IPv4 addresses. It's based on `z.string().ip({ version: "v4" })` from Zod.

**Usage:**

```typescript
import { Ipv4 } from 'chanfana';
import { z } from 'zod';

const ipAddressSchema = Ipv4({
    description: 'IPv4 address',
    example: '192.168.1.1',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "ipv4" in OpenAPI.

### `Ipv6`: IPv6 Address Strings

The `Ipv6` parameter type represents strings that must be valid IPv6 addresses. It's based on `z.string().ip({ version: "v6" })` from Zod.

**Usage:**

```typescript
import { Ipv6 } from 'chanfana';
import { z } from 'zod';

const ipv6AddressSchema = Ipv6({
    description: 'IPv6 address',
    example: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "ipv6" in OpenAPI.

### `Ip`: IP Address Strings (v4 or v6)

The `Ip` parameter type represents strings that must be valid IP addresses, either IPv4 or IPv6. It's based on `z.string().ip()` from Zod.

**Usage:**

```typescript
import { Ip } from 'chanfana';
import { z } from 'zod';

const anyIpAddressSchema = Ip({
    description: 'IP address (IPv4 or IPv6)',
    example: '192.168.1.1 or 2001:0db8:85a3::8a2e:0370:7334',
});
```

**Options:**

*   All options from `Str`.
*   **`format`:** Defaults to "ip" in OpenAPI.

## `Enumeration`: Defining Allowed String Values (Enums)

The `Enumeration` parameter type represents strings that must be one of a predefined set of allowed values (like enums in other languages). It's based on `z.enum()` from Zod.

**Usage:**

```typescript
import { Enumeration } from 'chanfana';
import { z } from 'zod';

const statusSchema = Enumeration({
    description: 'Order status',
    values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    enumCaseSensitive: false, // Optional: default is true (case-sensitive)
});
```

**Options:**

*   All options from `Str`.
*   **`values`:** (`Array<string>` or `Record<string, any>`) An array of allowed string values or a record where keys are allowed values and values are for internal mapping (if needed).
*   **`enumCaseSensitive`:** (boolean, default: `true`) Whether enum matching should be case-sensitive. If `false`, input values are converted to lowercase before matching.

## `Arr`: Arrays of a Specific Type

The `Arr` parameter type represents arrays where all elements must be of a specific type. It's based on `z.array()` from Zod.

**Usage:**

```typescript
import { Arr, Str } from 'chanfana';
import { z } from 'zod';

const tagsSchema = Arr(Str(), {
    description: 'Array of tags',
    minItems: 1,
    maxItems: 10,
    uniqueItems: true,
    example: ['tag1', 'tag2', 'tag3'],
});
```

**Options:**

*   All options from `Str` (applied to the array itself, not the array elements).
*   **`minItems`:** Minimum number of items in the array.
    *   **`maxItems`:** Maximum number of items in the array.
    *   **`uniqueItems`:** (boolean) If `true`, array elements must be unique.

The first argument to `Arr()` is the parameter type or Zod schema for the elements of the array (e.g., `Str()`, `Num()`, `z.string()`, `z.number()`, etc.).

## `Obj`: Objects with Defined Fields

The `Obj` parameter type represents objects with a predefined structure (fields and their types). It's based on `z.object()` from Zod.

**Usage:**

```typescript
import { Obj, Str, Num } from 'chanfana';
import { z } from 'zod';

const addressSchema = Obj({
    street: Str({ description: 'Street address' }),
    city: Str({ description: 'City' }),
    zipCode: Str({ description: 'Zip code', pattern: /^\d{5}(-\d{4})?$/ }),
    latitude: Num({ description: 'Latitude', required: false }),
    longitude: Num({ description: 'Longitude', required: false }),
}, {
    description: 'User address object',
});
```

**Options:**

*   All options from `Str` (applied to the object itself, not the object fields).

The first argument to `Obj()` is an object where keys are field names and values are parameter types or Zod schemas for each field.

## `convertParams`: Advanced Parameter Configuration

The `convertParams` function is a lower-level utility function used internally by Chanfana's parameter types. You can use it directly for advanced parameter configuration or when you need to apply parameter options to existing Zod schemas that are not created using Chanfana's parameter types.

**Usage:**

```typescript
import { convertParams, Str } from 'chanfana';
import { z } from 'zod';

const baseSchema = z.string(); // Existing Zod schema

const enhancedSchema = convertParams(baseSchema, {
    description: 'Enhanced string parameter',
    example: 'example value',
    required: false,
});
```

`convertParams(field, params)` takes a Zod schema (`field`) and a parameter options object (`params`) and applies the options to the schema, returning the modified schema.

---

By using these parameter types, you can precisely define the inputs of your API endpoints, enforce data validation, and generate comprehensive OpenAPI documentation, leading to more robust and developer-friendly APIs.
