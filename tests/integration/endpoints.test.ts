import { AutoRouter } from "itty-router";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { CreateEndpoint, DeleteEndpoint, fromIttyRouter, ListEndpoint, ReadEndpoint, UpdateEndpoint } from "../../src";
import type { Filters, ListFilters, UpdateFilters } from "../../src/endpoints/types";
import { buildRequest } from "../utils";

// Mock database for testing
const mockDB: Record<string, any> = {};

// Define a simple User model
const UserSchema = z.object({
  id: z.number().int(),
  username: z.string().min(3),
  email: z.string().email(),
  age: z.number().int().min(0).optional(),
});

type User = z.infer<typeof UserSchema>;

// CreateEndpoint implementation
class UserCreateEndpoint extends CreateEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };

  async create(data: User): Promise<User> {
    // Mock database insert
    mockDB[data.id] = { ...data };
    return mockDB[data.id];
  }
}

// ReadEndpoint implementation
class UserReadEndpoint extends ReadEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };

  async fetch(filters: ListFilters): Promise<User | null> {
    // Extract id from filters
    const idFilter = filters.filters.find((f) => f.field === "id");
    if (!idFilter) return null;

    const user = mockDB[idFilter.value as number];
    return user || null;
  }
}

// UpdateEndpoint implementation
class UserUpdateEndpoint extends UpdateEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };

  async getObject(filters: UpdateFilters): Promise<User | null> {
    const idFilter = filters.filters.find((f) => f.field === "id");
    if (!idFilter) return null;

    const user = mockDB[idFilter.value as number];
    return user || null;
  }

  async update(oldObj: User, filters: UpdateFilters): Promise<User> {
    const updated = { ...oldObj, ...filters.updatedData };
    mockDB[oldObj.id] = updated;
    return updated;
  }
}

// DeleteEndpoint implementation
class UserDeleteEndpoint extends DeleteEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };

  async getObject(filters: Filters): Promise<User | null> {
    const idFilter = filters.filters.find((f) => f.field === "id");
    if (!idFilter) return null;

    const user = mockDB[idFilter.value as number];
    return user || null;
  }

  async delete(oldObj: User, _filters: Filters): Promise<User | null> {
    const deleted = { ...oldObj };
    delete mockDB[oldObj.id];
    return deleted;
  }
}

// ListEndpoint implementation
class UserListEndpoint extends ListEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };

  filterFields = ["username", "email"];
  searchFields = ["username", "email"];
  orderByFields = ["id", "username", "email"];

  async list(filters: ListFilters) {
    let users = Object.values(mockDB);

    // Apply filters
    for (const filter of filters.filters) {
      if (filter.operator === "EQ") {
        users = users.filter((u: any) => u[filter.field] === filter.value);
      } else if (filter.operator === "LIKE") {
        // Simple search implementation
        const searchTerm = String(filter.value).toLowerCase();
        users = users.filter((u: any) => {
          return this.searchFields?.some((field) => String(u[field]).toLowerCase().includes(searchTerm));
        });
      }
    }

    // Apply ordering
    if (filters.options.order_by) {
      const field = filters.options.order_by as string;
      const direction = filters.options.order_by_direction || "asc";
      users.sort((a: any, b: any) => {
        if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
        if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const page = Number(filters.options.page) || 1;
    const perPage = Number(filters.options.per_page) || 20;
    const start = (page - 1) * perPage;
    const end = start + perPage;

    return {
      result: users.slice(start, end),
    };
  }
}

// Setup router
const router = fromIttyRouter(AutoRouter(), {
  schema: {
    info: {
      title: "User API Test",
      version: "1.0.0",
    },
  },
});

router.post("/users/:id", UserCreateEndpoint);
router.get("/users/:id", UserReadEndpoint);
router.put("/users/:id", UserUpdateEndpoint);
router.delete("/users/:id", UserDeleteEndpoint);
router.get("/users", UserListEndpoint);

describe("CreateEndpoint", () => {
  it("should create a user successfully", async () => {
    const body = JSON.stringify({
      username: "johndoe",
      email: "john@example.com",
      age: 25,
    });

    const request = await router.fetch(
      new Request("https://example.com/users/1", {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(201);
    expect(resp.success).toBe(true);
    expect(resp.result).toEqual({
      id: 1,
      username: "johndoe",
      email: "john@example.com",
      age: 25,
    });
  });

  it("should validate required fields", async () => {
    const request = await router.fetch(
      new Request("https://example.com/users/2", {
        method: "POST",
        body: JSON.stringify({
          username: "ab", // Too short
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(400);
    expect(resp.success).toBe(false);
    expect(resp.errors).toBeDefined();
    expect(resp.errors.length).toBeGreaterThan(0);
  });

  it("should merge path params into body", async () => {
    const request = await router.fetch(
      new Request("https://example.com/users/3", {
        method: "POST",
        body: JSON.stringify({
          username: "janedoe",
          email: "jane@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(201);
    expect(resp.result.id).toBe(3);
  });
});

describe("ReadEndpoint", () => {
  it("should read an existing user", async () => {
    // Setup: Create a user first
    mockDB[10] = {
      id: 10,
      username: "testuser",
      email: "test@example.com",
      age: 30,
    };

    const request = await router.fetch(
      buildRequest({
        method: "GET",
        path: "/users/10",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result).toEqual({
      id: 10,
      username: "testuser",
      email: "test@example.com",
      age: 30,
    });
  });

  it("should return 404 for non-existent user", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "GET",
        path: "/users/999",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(404);
    expect(resp.errors).toBeDefined();
  });
});

describe("UpdateEndpoint", () => {
  it("should update an existing user", async () => {
    // Setup: Create a user first
    mockDB[20] = {
      id: 20,
      username: "oldname",
      email: "old@example.com",
      age: 25,
    };

    const request = await router.fetch(
      new Request("https://example.com/users/20", {
        method: "PUT",
        body: JSON.stringify({
          username: "newname",
          email: "new@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.username).toBe("newname");
    expect(resp.result.email).toBe("new@example.com");
    expect(mockDB[20].username).toBe("newname");
  });

  it("should return 404 for non-existent user", async () => {
    const request = await router.fetch(
      new Request("https://example.com/users/888", {
        method: "PUT",
        body: JSON.stringify({
          username: "newname",
          email: "new@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(404);
    expect(resp.errors).toBeDefined();
  });

  it("should validate updated fields", async () => {
    mockDB[21] = {
      id: 21,
      username: "user21",
      email: "user21@example.com",
    };

    const request = await router.fetch(
      new Request("https://example.com/users/21", {
        method: "PUT",
        body: JSON.stringify({
          email: "invalid-email", // Invalid email
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(400);
    expect(resp.success).toBe(false);
    expect(resp.errors).toBeDefined();
  });
});

describe("DeleteEndpoint", () => {
  it("should delete an existing user", async () => {
    // Setup: Create a user first
    mockDB[30] = {
      id: 30,
      username: "deleteme",
      email: "delete@example.com",
    };

    const request = await router.fetch(
      buildRequest({
        method: "DELETE",
        path: "/users/30",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.id).toBe(30);
    expect(mockDB[30]).toBeUndefined();
  });

  it("should return 404 for non-existent user", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "DELETE",
        path: "/users/777",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(404);
    expect(resp.errors).toBeDefined();
  });
});

describe("ListEndpoint", () => {
  beforeEach(() => {
    // Setup: Create multiple users
    mockDB[100] = { id: 100, username: "alice", email: "alice@example.com", age: 25 };
    mockDB[101] = { id: 101, username: "bob", email: "bob@example.com", age: 30 };
    mockDB[102] = { id: 102, username: "charlie", email: "charlie@example.com", age: 35 };
    mockDB[103] = { id: 103, username: "david", email: "david@example.com", age: 40 };
  });

  it("should list all users with default pagination", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "GET",
        path: "/users",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(Array.isArray(resp.result)).toBe(true);
    expect(resp.result.length).toBeGreaterThan(0);
  });

  it("should filter users by username", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "GET",
        path: "/users?username=alice",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.length).toBe(1);
    expect(resp.result[0].username).toBe("alice");
  });

  it("should search users", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "GET",
        path: "/users?search=bob",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.some((u: any) => u.username === "bob")).toBe(true);
  });

  it("should order users by field", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "GET",
        path: "/users?order_by=username&order_by_direction=asc",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);

    // Filter to only users we care about
    const testUsers = resp.result.filter((u: any) => [100, 101, 102, 103].includes(u.id));

    if (testUsers.length >= 2) {
      expect(testUsers[0].username < testUsers[1].username).toBe(true);
    }
  });

  it("should paginate results", async () => {
    const request = await router.fetch(
      buildRequest({
        method: "GET",
        path: "/users?page=1&per_page=2",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.length).toBeLessThanOrEqual(2);
  });
});

describe("Endpoint Hooks", () => {
  class UserCreateWithHooks extends UserCreateEndpoint {
    async before(data: User): Promise<User> {
      // Add a default age if not provided
      return { ...data, age: data.age ?? 18 };
    }

    async after(data: User): Promise<User> {
      // Uppercase username after creation
      return { ...data, username: data.username.toUpperCase() };
    }
  }

  const hooksRouter = fromIttyRouter(AutoRouter());
  hooksRouter.post("/users-hooks/:id", UserCreateWithHooks);

  it("should call before and after hooks", async () => {
    const request = await hooksRouter.fetch(
      new Request("https://example.com/users-hooks/200", {
        method: "POST",
        body: JSON.stringify({
          username: "hooktest",
          email: "hooks@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(201);
    expect(resp.result.age).toBe(18); // Set by before hook
    expect(resp.result.username).toBe("HOOKTEST"); // Modified by after hook
  });
});

describe("Composite Primary Keys", () => {
  const mockCompositeDB: Record<string, any> = {};

  const CompositeSchema = z.object({
    organizationId: z.string(),
    userId: z.number().int(),
    role: z.string(),
  });

  type CompositeModel = z.infer<typeof CompositeSchema>;

  class CompositeReadEndpoint extends ReadEndpoint {
    _meta = {
      model: {
        tableName: "org_users",
        schema: CompositeSchema,
        primaryKeys: ["organizationId", "userId"],
      },
    };

    async fetch(filters: ListFilters): Promise<CompositeModel | null> {
      const orgId = filters.filters.find((f) => f.field === "organizationId")?.value;
      const userId = filters.filters.find((f) => f.field === "userId")?.value;
      const key = `${orgId}-${userId}`;
      return mockCompositeDB[key] || null;
    }
  }

  const compositeRouter = fromIttyRouter(AutoRouter());
  compositeRouter.get("/orgs/:organizationId/users/:userId", CompositeReadEndpoint);

  it("should handle composite primary keys", async () => {
    mockCompositeDB["org1-500"] = {
      organizationId: "org1",
      userId: 500,
      role: "admin",
    };

    const request = await compositeRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/orgs/org1/users/500",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.organizationId).toBe("org1");
    expect(resp.result.userId).toBe(500);
    expect(resp.result.role).toBe("admin");
  });
});

describe("Serializer and SerializerSchema", () => {
  const mockSerializerDB: Record<string, any> = {};

  const InternalSchema = z.object({
    id: z.number().int(),
    username: z.string(),
    email: z.string().email(),
    passwordHash: z.string(), // Internal field
    apiKey: z.string(), // Internal field
  });

  const PublicSchema = z.object({
    id: z.number().int(),
    username: z.string(),
    email: z.string().email(),
  });

  class SerializedReadEndpoint extends ReadEndpoint {
    _meta = {
      model: {
        tableName: "users",
        schema: InternalSchema,
        primaryKeys: ["id"],
        serializer: (obj: any) => {
          // Remove sensitive fields
          // biome-ignore lint: tests
          const { passwordHash, apiKey, ...publicData } = obj;
          return publicData;
        },
        serializerSchema: PublicSchema,
      },
    };

    async fetch(filters: ListFilters) {
      const id = filters.filters.find((f) => f.field === "id")?.value;
      return mockSerializerDB[id as number] || null;
    }
  }

  const serializerRouter = fromIttyRouter(AutoRouter());
  serializerRouter.get("/secure-users/:id", SerializedReadEndpoint);

  it("should use serializer to transform output", async () => {
    mockSerializerDB[600] = {
      id: 600,
      username: "secureuser",
      email: "secure@example.com",
      passwordHash: "hashed_password_123",
      apiKey: "secret_api_key_xyz",
    };

    const request = await serializerRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/secure-users/600",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.id).toBe(600);
    expect(resp.result.username).toBe("secureuser");
    expect(resp.result.email).toBe("secure@example.com");
    expect(resp.result.passwordHash).toBeUndefined();
    expect(resp.result.apiKey).toBeUndefined();
  });
});

describe("PathParameters in Nested Routes", () => {
  const mockNestedDB: Record<string, any> = {};

  const PostSchema = z.object({
    userId: z.number().int(),
    postId: z.number().int(),
    title: z.string(),
    content: z.string(),
  });

  type Post = z.infer<typeof PostSchema>;

  class NestedPostReadEndpoint extends ReadEndpoint {
    _meta = {
      model: {
        tableName: "posts",
        schema: PostSchema,
        primaryKeys: ["userId", "postId"],
      },
      pathParameters: ["userId", "postId"], // Explicitly define path parameters
    };

    async fetch(filters: ListFilters): Promise<Post | null> {
      const userId = filters.filters.find((f) => f.field === "userId")?.value;
      const postId = filters.filters.find((f) => f.field === "postId")?.value;
      const key = `${userId}-${postId}`;
      return mockNestedDB[key] || null;
    }
  }

  const nestedRouter = fromIttyRouter(AutoRouter());
  nestedRouter.get("/users/:userId/posts/:postId", NestedPostReadEndpoint);

  it("should work with pathParameters in nested routes", async () => {
    mockNestedDB["700-1"] = {
      userId: 700,
      postId: 1,
      title: "First Post",
      content: "This is my first post",
    };

    const request = await nestedRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/users/700/posts/1",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.userId).toBe(700);
    expect(resp.result.postId).toBe(1);
    expect(resp.result.title).toBe("First Post");
  });
});

describe("ListEndpoint Advanced Features", () => {
  const mockAdvancedDB: Record<string, any> = {};

  beforeEach(() => {
    // Setup advanced test data with categories
    mockAdvancedDB[800] = { id: 800, name: "Laptop", category: "electronics", price: 1000, stock: 10 };
    mockAdvancedDB[801] = { id: 801, name: "Mouse", category: "electronics", price: 25, stock: 100 };
    mockAdvancedDB[802] = { id: 802, name: "Desk", category: "furniture", price: 300, stock: 5 };
    mockAdvancedDB[803] = { id: 803, name: "Chair", category: "furniture", price: 150, stock: 20 };
    mockAdvancedDB[804] = { id: 804, name: "Monitor", category: "electronics", price: 400, stock: 15 };
  });

  const ProductSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    category: z.string(),
    price: z.number(),
    stock: z.number().int(),
  });

  class AdvancedListEndpoint extends ListEndpoint {
    _meta = {
      model: {
        tableName: "products",
        schema: ProductSchema,
        primaryKeys: ["id"],
      },
    };

    filterFields = ["category", "name"];
    searchFields = ["name", "category"];
    orderByFields = ["name", "price", "stock"];
    defaultOrderBy = "name";

    async list(filters: ListFilters) {
      let products = Object.values(mockAdvancedDB);

      // Apply filters
      for (const filter of filters.filters) {
        if (filter.operator === "EQ") {
          products = products.filter((p: any) => p[filter.field] === filter.value);
        } else if (filter.operator === "LIKE") {
          const searchTerm = String(filter.value).toLowerCase();
          products = products.filter((p: any) => {
            return this.searchFields?.some((field) => String(p[field]).toLowerCase().includes(searchTerm));
          });
        }
      }

      // Apply ordering
      if (filters.options.order_by) {
        const field = filters.options.order_by as string;
        const direction = filters.options.order_by_direction || "asc";
        products.sort((a: any, b: any) => {
          if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
          if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
          return 0;
        });
      }

      // Apply pagination
      const page = Number(filters.options.page) || 1;
      const perPage = Number(filters.options.per_page) || 20;
      const start = (page - 1) * perPage;
      const end = start + perPage;

      return {
        result: products.slice(start, end),
      };
    }
  }

  const advancedRouter = fromIttyRouter(AutoRouter());
  advancedRouter.get("/products", AdvancedListEndpoint);

  it("should use defaultOrderBy when no order specified", async () => {
    const request = await advancedRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/products",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.length).toBeGreaterThan(0);
  });

  it("should filter by category using filterFields", async () => {
    const request = await advancedRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/products?category=electronics",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.length).toBe(3); // Laptop, Mouse, Monitor
    expect(resp.result.every((p: any) => p.category === "electronics")).toBe(true);
  });

  it("should use custom order with orderByFields", async () => {
    const request = await advancedRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/products?category=electronics&order_by=price&order_by_direction=desc",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.length).toBe(3);
    expect(resp.result[0].price).toBe(1000); // Laptop (highest price)
    expect(resp.result[2].price).toBe(25); // Mouse (lowest price)
  });

  it("should support search across multiple fields", async () => {
    const request = await advancedRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/products?search=chair",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.length).toBe(1);
    expect(resp.result[0].name).toBe("Chair");
  });

  it("should combine filtering and ordering", async () => {
    const request = await advancedRouter.fetch(
      buildRequest({
        method: "GET",
        path: "/products?category=furniture&order_by=price&order_by_direction=asc",
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.length).toBe(2);
    expect(resp.result[0].name).toBe("Chair"); // Lower price
    expect(resp.result[1].name).toBe("Desk"); // Higher price
  });
});

describe("UpdateEndpoint with Zod 4 Optional Defaults", () => {
  const mockZod4DB: Record<string, any> = {};

  // Schema with optional fields that have defaults
  const UserWithDefaultsSchema = z.object({
    id: z.number().int(),
    username: z.string().min(3),
    email: z.email(),
    age: z.number().int().min(0).optional().default(18),
    status: z.enum(["active", "inactive"]).optional().default("active"),
    bio: z.string().optional(),
  });

  type UserWithDefaults = z.infer<typeof UserWithDefaultsSchema>;

  class UserWithDefaultsUpdateEndpoint extends UpdateEndpoint {
    _meta = {
      model: {
        tableName: "users",
        schema: UserWithDefaultsSchema,
        primaryKeys: ["id"],
      },
    };

    async getObject(filters: UpdateFilters): Promise<UserWithDefaults | null> {
      const idFilter = filters.filters.find((f) => f.field === "id");
      if (!idFilter) return null;

      const user = mockZod4DB[idFilter.value as number];
      return user || null;
    }

    async update(oldObj: UserWithDefaults, filters: UpdateFilters): Promise<UserWithDefaults> {
      const updated = { ...oldObj, ...filters.updatedData };
      mockZod4DB[oldObj.id] = updated;
      return updated;
    }
  }

  const zod4Router = fromIttyRouter(AutoRouter());
  zod4Router.put("/zod4-users/:id", UserWithDefaultsUpdateEndpoint);

  beforeEach(() => {
    // Clear and setup test data
    Object.keys(mockZod4DB).forEach((key) => delete mockZod4DB[key]);
  });

  it("should NOT overwrite fields with defaults when not provided in request", async () => {
    // Setup: User with non-default values
    mockZod4DB[900] = {
      id: 900,
      username: "testuser",
      email: "test@example.com",
      age: 30, // NOT the default value of 18
      status: "inactive", // NOT the default value of "active"
      bio: "Original bio",
    };

    // Update only the username - age and status should remain unchanged
    const request = await zod4Router.fetch(
      new Request("https://example.com/zod4-users/900", {
        method: "PUT",
        body: JSON.stringify({
          username: "newusername",
          email: "test@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.success).toBe(true);
    expect(resp.result.username).toBe("newusername");
    expect(resp.result.age).toBe(30); // Should remain 30, NOT reset to default 18
    expect(resp.result.status).toBe("inactive"); // Should remain "inactive", NOT reset to default "active"
    expect(resp.result.bio).toBe("Original bio"); // Should remain unchanged
  });

  it("should allow explicitly setting fields to their default values", async () => {
    // Setup: User with non-default values
    mockZod4DB[901] = {
      id: 901,
      username: "user901",
      email: "user901@example.com",
      age: 35,
      status: "inactive",
    };

    // Explicitly set age to the default value
    const request = await zod4Router.fetch(
      new Request("https://example.com/zod4-users/901", {
        method: "PUT",
        body: JSON.stringify({
          username: "user901",
          email: "user901@example.com",
          age: 18, // Explicitly setting to default
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.age).toBe(18); // Should be updated to 18
  });

  it("should handle updating optional fields without defaults", async () => {
    mockZod4DB[902] = {
      id: 902,
      username: "user902",
      email: "user902@example.com",
      age: 25,
      status: "active",
      bio: "Old bio",
    };

    // Update bio (optional without default)
    const request = await zod4Router.fetch(
      new Request("https://example.com/zod4-users/902", {
        method: "PUT",
        body: JSON.stringify({
          username: "user902",
          email: "user902@example.com",
          bio: "New bio",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.bio).toBe("New bio");
    expect(resp.result.age).toBe(25); // Should remain unchanged
  });

  it("should handle empty request body without overwriting with defaults", async () => {
    mockZod4DB[903] = {
      id: 903,
      username: "user903",
      email: "user903@example.com",
      age: 40,
      status: "inactive",
    };

    // Send minimal required fields only
    const request = await zod4Router.fetch(
      new Request("https://example.com/zod4-users/903", {
        method: "PUT",
        body: JSON.stringify({
          username: "user903",
          email: "user903@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.age).toBe(40); // Should NOT be reset to 18
    expect(resp.result.status).toBe("inactive"); // Should NOT be reset to "active"
  });

  it("should properly handle partial updates with mixed fields", async () => {
    mockZod4DB[904] = {
      id: 904,
      username: "user904",
      email: "user904@example.com",
      age: 50,
      status: "inactive",
      bio: "Original bio",
    };

    // Update some fields but not others
    const request = await zod4Router.fetch(
      new Request("https://example.com/zod4-users/904", {
        method: "PUT",
        body: JSON.stringify({
          username: "updated904",
          email: "updated904@example.com",
          status: "active", // Explicitly update this one
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const resp = await request.json();

    expect(request.status).toBe(200);
    expect(resp.result.username).toBe("updated904");
    expect(resp.result.status).toBe("active"); // Should be updated
    expect(resp.result.age).toBe(50); // Should NOT be reset to default
    expect(resp.result.bio).toBe("Original bio"); // Should remain unchanged
  });
});
