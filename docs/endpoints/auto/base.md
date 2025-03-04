# Auto Endpoints for CRUD Operations

Chanfana provides a set of auto endpoint classes that streamline the development of common CRUD (Create, Read, Update, Delete) operations for your APIs. These auto endpoints significantly reduce boilerplate code and provide a consistent structure for standard data management operations.

## Introduction to Auto Endpoints

Chanfana offers the following auto endpoint classes, all extending the base `OpenAPIRoute` class:

*   **`CreateEndpoint`:** For creating new resources. Handles `POST` requests.
*   **`ReadEndpoint`:** For retrieving a single resource. Handles `GET` requests for a specific resource identifier.
*   **`UpdateEndpoint`:** For updating existing resources. Handles `PUT` or `PATCH` requests.
*   **`DeleteEndpoint`:** For deleting resources. Handles `DELETE` requests.
*   **`ListEndpoint`:** For listing multiple resources, often with pagination and filtering. Handles `GET` requests for collections of resources.

These endpoints are designed to work with a **Meta** object, which you need to define for each endpoint. The `Meta` object describes your data model, including its schema, primary keys, and table name (if applicable, especially for database-backed endpoints).

## Defining the `Meta` Object

The `Meta` object is crucial for auto endpoints. It provides Chanfana with the necessary information about your data model to generate schemas and perform operations.

The `Meta` object has the following structure:

```typescript
type MetaInput = {
    model: Model;
    fields?: AnyZodObject; // Optional, defaults to model.schema
};

type Model = {
    tableName: string; // Optional, but recommended for database-backed endpoints
    schema: AnyZodObject; // Zod schema defining the data model
    primaryKeys: Array<string>; // Array of primary key field names
    serializer?: (obj: object) => object; // Optional serializer function
    serializerSchema?: AnyZodObject; // Optional schema for serialized output
};
```

**Key properties of `Meta`:**

*   **`model`:**  Describes the data model itself.
    *   **`tableName` (optional):** The name of the database table (if your data is stored in a database). Useful for D1 endpoints.
    *   **`schema` (required):** A Zod schema that defines the structure of your data model. This schema is used for schema generation and validation.
    *   **`primaryKeys` (required):** An array of strings representing the primary key fields of your data model. Used for identifying resources in `ReadEndpoint`, `UpdateEndpoint`, and `DeleteEndpoint`.
    *   **`serializer` (optional):** A function to serialize your data before sending it in responses. Useful for data transformation or formatting. If not provided, a default serializer that returns the object as is is used.
    *   **`serializerSchema` (optional):** A Zod schema for the serialized output. If a `serializer` is provided, you should also provide a `serializerSchema` to document the serialized response structure correctly. If not provided, defaults to `model.schema`.

*   **`fields` (optional):**  A Zod schema that represents all possible fields of your data model. If not provided, it defaults to `model.schema`. You can use `fields` to define a broader schema than `model.schema` if needed, for example, if your database table has more columns than you want to expose in your API.

## `CreateEndpoint`: Streamlining Resource Creation

`CreateEndpoint` simplifies the creation of new resources. It handles `POST` requests and expects the data for the new resource in the request body.

**Example: Creating a New Product**

```typescript
import { Hono } from 'hono';
import { fromHono, CreateEndpoint, contentJson } from 'chanfana';
import { z } from 'zod';

// Define the Product Model
const ProductModel = z.object({
    id: z.string().uuid(),
    name: z.string().min(3),
    description: z.string().optional(),
    price: z.number().positive(),
    createdAt: z.string().datetime(),
});

// Define the Meta object for Product
const productMeta = {
    model: {
        schema: ProductModel,
        primaryKeys: ['id'],
        tableName: 'products', // Optional table name (for D1 endpoints)
    },
};

class CreateProduct extends CreateEndpoint {
    _meta = productMeta; // Assign the Meta object

    async create(data: z.infer<typeof ProductModel>) {
        // In a real application, you would save 'data' to a database here
        console.log("Creating product:", data);
        return data; // Return the created object
    }
}

const app = new Hono();
const openapi = fromHono(app);
openapi.post('/products', CreateProduct);

export default app;
```

In this example:

*   We define `ProductModel` using Zod to represent the structure of a product.
*   We create `productMeta` with the `model` property, including the `schema`, `primaryKeys`, and `tableName`.
*   `CreateProduct` extends `CreateEndpoint` and assigns `productMeta` to `_meta`.
*   We override the `create` method to implement the logic for creating a product (in this example, just logging and returning the data).
*   The `POST /products` route is registered with `CreateProduct`.

`CreateEndpoint` automatically generates the OpenAPI schema for the request body (based on `productMeta.model.schema`) and the successful response (200 OK, returning the created object). It also handles validation of the request body.

## `ReadEndpoint`: Efficient Resource Retrieval

`ReadEndpoint` is used to retrieve a single resource based on its primary key(s). It handles `GET` requests with path parameters corresponding to the primary keys.

**Example: Getting Product Details**

```typescript
import { Hono } from 'hono';
import { fromHono, ReadEndpoint, contentJson } from 'chanfana';
import { z } from 'zod';

// (ProductModel and productMeta are assumed to be defined as in the CreateEndpoint example)

class GetProduct extends ReadEndpoint {
    _meta = productMeta;

    async fetch(filters: any) {
        const productId = filters.filters[0].value; // Accessing the productId from filters
        // In a real application, you would fetch product from database based on productId
        const product = { id: productId, name: `Product ${productId}`, price: 99.99 }; // Simulate product data
        return product;
    }
}

const app = new Hono();
const openapi = fromHono(app);
openapi.get('/products/:productId', GetProduct); // Route with path parameter :productId

export default app;
```

In this example:

*   `GetProduct` extends `ReadEndpoint` and uses the same `productMeta`.
*   We override the `fetch` method to implement the logic for retrieving a product based on the `productId` filter.
*   The `GET /products/:productId` route is registered with `GetProduct`.

`ReadEndpoint` automatically generates the OpenAPI schema for the path parameter `productId` and the successful response (200 OK, returning the product object). It also handles validation of the path parameter.

## `UpdateEndpoint`: Simplifying Resource Updates

`UpdateEndpoint` is used to update existing resources. It handles `PUT` or `PATCH` requests. It typically expects the primary key(s) to identify the resource to update (either in the path or body) and the updated data in the request body.

**Example: Modifying Product Information**

```typescript
import { Hono } from 'hono';
import { fromHono, UpdateEndpoint, contentJson } from 'chanfana';
import { z } from 'zod';

// (ProductModel and productMeta are assumed to be defined as in the CreateEndpoint example)

class UpdateProduct extends UpdateEndpoint {
    _meta = productMeta;

    async getObject(filters: any) {
        const productId = filters.filters[0].value;
        // In a real app, fetch the existing product from DB based on productId
        const existingProduct = { id: productId, name: `Product ${productId}`, price: 99.99 }; // Simulate
        return existingProduct;
    }

    async update(oldObj: any, filters: any) {
        const productId = filters.filters[0].value;
        const updatedData = filters.updatedData;
        const updatedProduct = { ...oldObj, ...updatedData, id: productId }; // Simulate update
        console.log("Updating product:", updatedProduct);
        return updatedProduct;
    }
}

const app = new Hono();
const openapi = fromHono(app);
openapi.put('/products/:productId', UpdateProduct); // Or .patch() for PATCH requests

export default app;
```

In this example:

*   `UpdateProduct` extends `UpdateEndpoint` and uses `productMeta`.
*   We override `getObject` to fetch the existing product based on `productId` (simulated here).
*   We override `update` to apply the `updatedData` to the `oldObj` (existing product) and return the updated product (simulated update logic).
*   The `PUT /products/:productId` route is registered with `UpdateProduct`.

`UpdateEndpoint` generates schemas for the path parameter, request body (based on `productMeta.model.schema`), and the successful response (200 OK, returning the updated object). It also handles validation.

## `DeleteEndpoint`: Easy Resource Deletion

`DeleteEndpoint` is used to delete resources. It handles `DELETE` requests, typically identified by primary key(s) in the path or body.

**Example: Removing a Product**

```typescript
import { Hono } from 'hono';
import { fromHono, DeleteEndpoint } from 'chanfana';
import { z } from 'zod';

// (ProductModel and productMeta are assumed to be defined as in the CreateEndpoint example)

class DeleteProduct extends DeleteEndpoint {
    _meta = productMeta;

    async getObject(filters: any) {
        const productId = filters.filters[0].value;
        // In a real app, check if product exists in DB based on productId
        const existingProduct = { id: productId, name: `Product ${productId}`, price: 99.99 }; // Simulate
        return existingProduct; // Return the object to be deleted (for logging/auditing)
    }

    async delete(oldObj: any, filters: any) {
        const productId = filters.filters[0].value;
        console.log("Deleting product:", productId);
        // In a real app, delete product from DB based on productId
        return oldObj; // Return the deleted object
    }
}

const app = new Hono();
const openapi = fromHono(app);
openapi.delete('/products/:productId', DeleteProduct);

export default app;
```

In this example:

*   `DeleteProduct` extends `DeleteEndpoint` and uses `productMeta`.
*   `getObject` (overridden) simulates checking if the product exists before deletion.
*   `delete` (overridden) simulates deleting the product (just logging here).
*   The `DELETE /products/:productId` route is registered with `DeleteProduct`.

`DeleteEndpoint` generates schemas for the path parameter and the successful response (200 OK, returning the deleted object). It also handles validation.

## `ListEndpoint`: Implementing Resource Listing and Pagination

`ListEndpoint` is used to list collections of resources, often with pagination, filtering, and sorting capabilities. It handles `GET` requests for collections.

**Example: Listing Products with Filtering and Pagination**

```typescript
import { Hono } from 'hono';
import { fromHono, ListEndpoint, contentJson } from 'chanfana';
import { z } from 'zod';

// (ProductModel and productMeta are assumed to be defined as in the CreateEndpoint example)

class ListProducts extends ListEndpoint {
    _meta = productMeta;
  
    filterFields = ['category', 'minPrice', 'maxPrice']; // Fields available for filtering
    orderByFields = ['name', 'price', 'createdAt'];     // Fields available for ordering
    defaultOrderBy = 'name';                             // Default sort field

    async list(filters: any) {
        const options = filters.options;
        const filterConditions = filters.filters;
        console.log("Listing products with options:", options, "and filters:", filterConditions);
        // In a real app, you would query the database with pagination, filtering, and sorting
        const products = [ // Simulate product list
            { id: 'product-1', name: 'Product A', price: 10 },
            { id: 'product-2', name: 'Product B', price: 20 },
            // ... more products ...
        ];
        return { result: products };
    }
}

const app = new Hono();
const openapi = fromHono(app);
openapi.get('/products', ListProducts);

export default app;
```

In this example:

*   `ListProducts` extends `ListEndpoint` and uses `productMeta`.
*   `filterFields`, `orderByFields`, and `defaultOrderBy` are configured to enable filtering and sorting.
*   `list` (overridden) simulates fetching a list of products based on the provided `filters` (including pagination and filter conditions).
*   The `GET /products` route is registered with `ListProducts`.

`ListEndpoint` automatically generates OpenAPI schemas for pagination parameters (`page`, `per_page`), filtering parameters (based on `filterFields`), ordering parameters (`order_by`, `order_by_direction`), and the successful response (200 OK, returning a list of products and result metadata).

## Customizing Auto Endpoints

You can customize auto endpoints by:

*   **Overriding lifecycle methods:** Methods like `create`, `read`, `update`, `delete`, `list`, `before`, and `after` can be overridden to implement your specific business logic, data access, and pre/post-processing steps.
*   **Setting `filterFields`, `orderByFields`, `defaultOrderBy` (for `ListEndpoint`):**  Configure filtering and sorting capabilities for list endpoints.
*   **Extending auto endpoint classes:** You can create your own custom base endpoint classes that extend `CreateEndpoint`, `ReadEndpoint`, etc., to add reusable logic or modify default behavior.

## When to Use Auto Endpoints

Auto endpoints are ideal for standard CRUD operations where you are working with data models that have primary keys and you need to perform common data management tasks. They are particularly useful when:

*   You are building RESTful APIs that follow standard CRUD patterns.
*   You want to reduce boilerplate code for common operations.
*   You want to ensure consistency in your API structure and documentation for CRUD endpoints.
*   You are working with database-backed APIs (especially with D1 endpoints, as we'll see in the next section).

However, if your API logic is highly custom or doesn't fit the CRUD pattern well, you might need to use the base `OpenAPIRoute` class and define your endpoints from scratch.

---

Next, we will explore [**Working with D1 Database Endpoints**](./d1.md) to see how Chanfana provides specialized endpoints for Cloudflare D1 databases.
