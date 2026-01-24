# Parameters: Defining Input Types with Zod

Chanfana uses native Zod schemas to define the inputs of your API endpoints, ensuring data validation and clear OpenAPI documentation. This guide covers how to use Zod effectively for request body fields, query parameters, path parameters, and headers.

## Introduction

With Chanfana v3, all parameter types are defined using native Zod schemas. This provides:

- **Type safety**: Full TypeScript inference
- **Validation**: Built-in Zod validation
- **OpenAPI generation**: Automatic schema documentation
- **Flexibility**: Access to all Zod features

## Basic Types

### Strings

```typescript
import { z } from 'zod';

// Basic string
const nameSchema = z.string();

// With description (appears in OpenAPI docs)
const usernameSchema = z.string().describe("User's username");

// With constraints
const passwordSchema = z.string().min(8).max(100);

// With OpenAPI metadata
const titleSchema = z.string().openapi({
    description: 'Article title',
    example: 'Getting Started with Chanfana',
});
```

### Numbers

```typescript
import { z } from 'zod';

// Floating-point number
const priceSchema = z.number();

// Integer
const ageSchema = z.number().int();

// With constraints
const quantitySchema = z.number().int().min(1).max(100);

// With OpenAPI type hint for proper documentation
const countSchema = z.number().int().openapi({ type: "integer" });
```

### Booleans

```typescript
import { z } from 'zod';

const isActiveSchema = z.boolean();

// With default value
const enabledSchema = z.boolean().default(true);

// With OpenAPI metadata
const verifiedSchema = z.boolean().openapi({
    description: 'Whether the user is verified',
    example: true,
});
```

## Zod v4 String Format Types

Zod v4 provides top-level functions for common string formats:

```typescript
import { z } from 'zod';

// Email validation
const emailSchema = z.email();

// UUID validation
const userIdSchema = z.uuid();

// URL validation
const websiteSchema = z.url();

// ISO datetime (e.g., "2024-01-20T10:30:00Z")
const createdAtSchema = z.iso.datetime();

// ISO date only (e.g., "2024-01-20")
const birthDateSchema = z.iso.date();

// IPv4 address
const ipv4Schema = z.ipv4();

// IPv6 address
const ipv6Schema = z.ipv6();

// Either IPv4 or IPv6
const ipSchema = z.union([z.ipv4(), z.ipv6()]);
```

**Note:** The old Zod v3 syntax (`z.string().email()`, `z.string().uuid()`, etc.) is deprecated. Use the Zod v4 top-level functions shown above.

## Pattern Matching (Regex)

```typescript
import { z } from 'zod';

// Phone number pattern
const phoneSchema = z.string().regex(
    /^\+?[1-9]\d{1,14}$/,
    'Invalid phone number format'
);

// Hostname pattern
const hostnameSchema = z.string().regex(
    /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/
);

// Slug pattern
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
```

## Enumerations

```typescript
import { z } from 'zod';

// Simple enum
const statusSchema = z.enum(['pending', 'processing', 'shipped', 'delivered']);

// With default
const prioritySchema = z.enum(['low', 'medium', 'high']).default('medium');

// With value mapping (transform input to different output)
const formatSchema = z
    .enum(['json', 'csv', 'xml'])
    .transform((val) => ({
        json: 'application/json',
        csv: 'text/csv',
        xml: 'application/xml',
    })[val]);

// Case-insensitive enum (preprocess to lowercase)
const caseInsensitiveStatus = z
    .preprocess((val) => String(val).toLowerCase(), z.enum(['active', 'inactive']))
    .openapi({ enum: ['active', 'inactive'] });
```

## Arrays

```typescript
import { z } from 'zod';

// Array of strings
const tagsSchema = z.array(z.string());

// Alternative syntax
const numbersSchema = z.number().array();

// With constraints
const itemsSchema = z.array(z.string()).min(1).max(10);

// Array of dates
const datesSchema = z.iso.date().array();

// With OpenAPI metadata
const categoriesSchema = z.array(z.string()).openapi({
    description: 'List of category names',
    example: ['electronics', 'books', 'clothing'],
});
```

## Objects

```typescript
import { z } from 'zod';

// Nested object
const addressSchema = z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.string().optional(),
});

// With OpenAPI descriptions
const userProfileSchema = z.object({
    firstName: z.string().describe('First name'),
    lastName: z.string().describe('Last name'),
    age: z.number().int().min(0).optional().describe('Age in years'),
});
```

## Optional and Default Values

```typescript
import { z } from 'zod';

// Optional field
const middleNameSchema = z.string().optional();

// With default value
const pageSchema = z.number().int().default(1);
const perPageSchema = z.number().int().default(20);

// Optional with default
const sortOrderSchema = z.enum(['asc', 'desc']).optional().default('asc');

// Nullable
const deletedAtSchema = z.iso.datetime().nullable();
```

## Adding OpenAPI Metadata

Use `.describe()` for simple descriptions and `.openapi()` for full OpenAPI metadata:

```typescript
import { z } from 'zod';

// Simple description
const nameSchema = z.string().describe("User's full name");

// Full OpenAPI metadata
const priceSchema = z.number().openapi({
    description: 'Product price in USD',
    example: 29.99,
    minimum: 0,
});

// Format hints for OpenAPI
const passwordSchema = z.string().min(8).openapi({
    format: 'password',
    description: 'User password (min 8 characters)',
});

// Multiple metadata options
const emailSchema = z.email().openapi({
    description: 'Contact email address',
    example: 'user@example.com',
});
```

## Complete Example

Here's a complete example showing various parameter types in an endpoint:

```typescript
import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';

class CreateOrderEndpoint extends OpenAPIRoute {
    schema = {
        tags: ['Orders'],
        summary: 'Create a new order',
        request: {
            params: z.object({
                storeId: z.uuid().describe('Store identifier'),
            }),
            query: z.object({
                notify: z.boolean().optional().default(true).describe('Send notification email'),
                priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
            }),
            headers: z.object({
                'X-Idempotency-Key': z.uuid().describe('Unique request identifier'),
            }),
            body: contentJson(z.object({
                customerId: z.uuid(),
                items: z.array(z.object({
                    productId: z.uuid(),
                    quantity: z.number().int().min(1),
                    price: z.number().min(0),
                })).min(1),
                shippingAddress: z.object({
                    street: z.string(),
                    city: z.string(),
                    zipCode: z.string(),
                    country: z.string().length(2).describe('ISO 3166-1 alpha-2 country code'),
                }),
                notes: z.string().optional(),
                requestedDelivery: z.iso.date().optional(),
            })),
        },
        responses: {
            '201': {
                description: 'Order created successfully',
                ...contentJson(z.object({
                    id: z.uuid(),
                    status: z.enum(['pending', 'confirmed']),
                    createdAt: z.iso.datetime(),
                })),
            },
        },
    };

    async handle(c) {
        const data = await this.getValidatedData<typeof this.schema>();

        // data.params.storeId - string (UUID)
        // data.query.notify - boolean
        // data.query.priority - 'low' | 'normal' | 'high'
        // data.headers['X-Idempotency-Key'] - string (UUID)
        // data.body.customerId - string (UUID)
        // data.body.items - array of order items
        // etc.

        return {
            id: crypto.randomUUID(),
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
    }
}
```

## Migration from Parameter Helpers

If you're migrating from older versions of Chanfana that used parameter helpers, here's the mapping:

| Old Helper | New Zod Equivalent |
|------------|-------------------|
| `Str()` | `z.string()` |
| `Num()` | `z.number()` |
| `Int()` | `z.number().int()` |
| `Bool()` | `z.boolean()` |
| `DateTime()` | `z.iso.datetime()` |
| `DateOnly()` | `z.iso.date()` |
| `Email()` | `z.email()` |
| `Uuid()` | `z.uuid()` |
| `Ipv4()` | `z.ipv4()` |
| `Ipv6()` | `z.ipv6()` |
| `Ip()` | `z.union([z.ipv4(), z.ipv6()])` |
| `Hostname()` | `z.string().regex(/hostname-pattern/)` |
| `Regex({ pattern })` | `z.string().regex(pattern)` |
| `Enumeration({ values })` | `z.enum([...])` |

For options like `description`, `example`, and `default`, use Zod's native methods:

```typescript
// Old
Str({ description: 'Name', example: 'John', default: 'Anonymous' })

// New
z.string()
    .default('Anonymous')
    .describe('Name')
    .openapi({ example: 'John' })
```

---

By using native Zod schemas, you get full access to Zod's powerful validation capabilities while maintaining seamless OpenAPI documentation generation.
