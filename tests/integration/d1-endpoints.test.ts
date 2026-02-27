import { env } from "cloudflare:test";
import { AutoRouter } from "itty-router";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  D1CreateEndpoint,
  D1DeleteEndpoint,
  D1ListEndpoint,
  D1ReadEndpoint,
  D1UpdateEndpoint,
  fromIttyRouter,
  InputValidationException,
  type OrderByDirection,
} from "../../src";

// User schema for testing - id is optional because it's auto-generated
const UserSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  email: z.string(),
  age: z.number().optional(),
});

// D1 Endpoint implementations
class UserCreateEndpoint extends D1CreateEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };
  dbName = "DB";
}

class UserReadEndpoint extends D1ReadEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };
  dbName = "DB";
}

class UserUpdateEndpoint extends D1UpdateEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };
  dbName = "DB";
}

class UserDeleteEndpoint extends D1DeleteEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };
  dbName = "DB";
}

class UserListEndpoint extends D1ListEndpoint {
  _meta = {
    model: {
      tableName: "users",
      schema: UserSchema,
      primaryKeys: ["id"],
    },
  };
  dbName = "DB";
  filterFields = ["name", "email"];
  searchFields = ["name", "email"];
  orderByFields = ["id", "name", "email", "age"];
  defaultOrderBy = "id";
}

// Helper function to setup the database
async function setupDatabase() {
  // Drop and recreate table for clean state
  await env.DB.prepare("DROP TABLE IF EXISTS users").run();
  await env.DB.prepare(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      age INTEGER
    )
  `).run();
}

// Helper function to seed test data
async function seedTestData() {
  await env.DB.prepare("INSERT INTO users (name, email, age) VALUES ('Alice', 'alice@example.com', 25)").run();
  await env.DB.prepare("INSERT INTO users (name, email, age) VALUES ('Bob', 'bob@example.com', 30)").run();
  await env.DB.prepare("INSERT INTO users (name, email, age) VALUES ('Charlie', 'charlie@example.com', 35)").run();
}

describe("D1 Endpoints", () => {
  const router = fromIttyRouter(AutoRouter({ base: "/api" }), {
    base: "/api",
  });

  // Register routes
  router.post("/users", UserCreateEndpoint);
  router.get("/users", UserListEndpoint);
  router.get("/users/:id", UserReadEndpoint);
  router.put("/users/:id", UserUpdateEndpoint);
  router.delete("/users/:id", UserDeleteEndpoint);

  beforeEach(async () => {
    await setupDatabase();
  });

  describe("D1CreateEndpoint", () => {
    it("should create a new user", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users", {
          method: "POST",
          body: JSON.stringify({
            name: "Test User",
            email: "test@example.com",
            age: 28,
          }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Test User");
      expect(data.result.email).toBe("test@example.com");
      expect(data.result.age).toBe(28);
      expect(data.result.id).toBeDefined();
    });

    it("should create a user without optional fields", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users", {
          method: "POST",
          body: JSON.stringify({
            name: "No Age User",
            email: "noage@example.com",
          }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("No Age User");
      expect(data.result.age).toBeNull();
    });

    it("should fail with duplicate email (UNIQUE constraint)", async () => {
      // First create a user
      await router.fetch(
        new Request("https://example.com/api/users", {
          method: "POST",
          body: JSON.stringify({
            name: "First User",
            email: "duplicate@example.com",
          }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );

      // Try to create another with same email
      const response = await router.fetch(
        new Request("https://example.com/api/users", {
          method: "POST",
          body: JSON.stringify({
            name: "Second User",
            email: "duplicate@example.com",
          }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe("D1ReadEndpoint", () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it("should read an existing user", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users/1", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.id).toBe(1);
      expect(data.result.name).toBe("Alice");
      expect(data.result.email).toBe("alice@example.com");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users/999", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("D1UpdateEndpoint", () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it("should update an existing user", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users/1", {
          method: "PUT",
          body: JSON.stringify({
            name: "Alice Updated",
            email: "alice.updated@example.com",
          }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.id).toBe(1);
      expect(data.result.name).toBe("Alice Updated");
      expect(data.result.email).toBe("alice.updated@example.com");
    });

    it("should partially update a user (only name)", async () => {
      // Note: The UpdateEndpoint requires all required fields in the body.
      // For true partial updates, use .partial() on the schema or provide a fields override.
      const response = await router.fetch(
        new Request("https://example.com/api/users/2", {
          method: "PUT",
          body: JSON.stringify({
            name: "Bob Updated",
            email: "bob@example.com", // Required field must be provided
          }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Bob Updated");
      expect(data.result.email).toBe("bob@example.com");
    });

    it("should return 404 for non-existent user", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users/999", {
          method: "PUT",
          body: JSON.stringify({
            name: "Nobody",
            email: "nobody@example.com", // Required field must be provided
          }),
          headers: { "Content-Type": "application/json" },
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("D1DeleteEndpoint", () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it("should delete an existing user", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users/1", {
          method: "DELETE",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify user is actually deleted
      const checkResponse = await router.fetch(
        new Request("https://example.com/api/users/1", {
          method: "GET",
        }),
        env,
      );

      expect(checkResponse.status).toBe(404);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users/999", {
          method: "DELETE",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe("D1ListEndpoint", () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it("should list all users", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toHaveLength(3);
      expect(data.result_info.total_count).toBe(3);
    });

    it("should paginate results", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?per_page=2&page=1", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result).toHaveLength(2);
      expect(data.result_info.page).toBe(1);
      expect(data.result_info.per_page).toBe(2);
      expect(data.result_info.total_count).toBe(3);
    });

    it("should filter by field", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?name=Alice", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result).toHaveLength(1);
      expect(data.result[0].name).toBe("Alice");
    });

    it("should search across fields", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?search=bob", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result).toHaveLength(1);
      expect(data.result[0].name).toBe("Bob");
    });

    it("should order results ascending", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?order_by=name&order_by_direction=asc", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result[0].name).toBe("Alice");
      expect(data.result[1].name).toBe("Bob");
      expect(data.result[2].name).toBe("Charlie");
    });

    it("should order results descending", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?order_by=name&order_by_direction=desc", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result[0].name).toBe("Charlie");
      expect(data.result[1].name).toBe("Bob");
      expect(data.result[2].name).toBe("Alice");
    });

    it("should return empty result for no matches", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?name=NonExistent", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result).toHaveLength(0);
      expect(data.result_info.total_count).toBe(0);
    });
  });

  describe("SQL Injection Prevention", () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it("should safely handle SQL injection in search query", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?search=' OR '1'='1", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      // Should not return all users due to injection
      // The search should be treated as a literal string
      expect(response.status).toBe(200);
      expect(data.result).toHaveLength(0); // No match for that literal string
    });

    it("should safely handle SQL injection in order_by", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?order_by=id; DROP TABLE users;--", {
          method: "GET",
        }),
        env,
      );

      // Invalid order_by values are validated and rejected with 400
      // This prevents SQL injection by not allowing arbitrary strings in ORDER BY
      // The validation occurs at the query parameter level, before SQL is built
      expect(response.status).toBe(400);

      // Verify table still exists (SQL injection prevented)
      const result = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
      expect(result?.count).toBe(3);
    });

    it("should safely handle SQL injection in filter values", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?name=' OR '1'='1'; DROP TABLE users;--", {
          method: "GET",
        }),
        env,
      );

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.result).toHaveLength(0);

      // Verify table still exists
      const result = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
      expect(result?.count).toBe(3);
    });
  });

  describe("Pagination", () => {
    beforeEach(async () => {
      await seedTestData();
    });

    it("should return page 2 results", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?per_page=2&page=2", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result).toHaveLength(1);
      expect(data.result_info.page).toBe(2);
      expect(data.result_info.total_count).toBe(3);
    });

    it("should return empty results for page beyond total", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?per_page=2&page=100", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;

      expect(response.status).toBe(200);
      expect(data.result).toHaveLength(0);
      expect(data.result_info.total_count).toBe(3);
    });
  });

  describe("LIKE wildcard escaping", () => {
    beforeEach(async () => {
      await setupDatabase();
      // Insert users with wildcard characters in names
      await env.DB.prepare(
        "INSERT INTO users (name, email, age) VALUES ('100% complete', 'percent@example.com', 25)",
      ).run();
      await env.DB.prepare(
        "INSERT INTO users (name, email, age) VALUES ('user_one', 'underscore@example.com', 30)",
      ).run();
      await env.DB.prepare(
        "INSERT INTO users (name, email, age) VALUES ('normal user', 'normal@example.com', 35)",
      ).run();
    });

    it("should escape % in search queries", async () => {
      const response = await router.fetch(
        new Request("https://example.com/api/users?search=100%25", {
          method: "GET",
        }),
        env,
      );

      const data = (await response.json()) as any;
      expect(response.status).toBe(200);
      // Should only match the literal "100%" user, not all users
      expect(data.result).toHaveLength(1);
      expect(data.result[0].name).toBe("100% complete");
    });
  });
});

describe("D1 Endpoints with constraintsMessages", () => {
  class UserCreateWithConstraintsEndpoint extends D1CreateEndpoint {
    _meta = {
      model: {
        tableName: "users",
        schema: UserSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";
    constraintsMessages = {
      "users.email": new InputValidationException("Email already exists", ["body", "email"]),
    };
  }

  const router = fromIttyRouter(AutoRouter({ base: "/api" }), { base: "/api" });
  router.post("/constrained-users", UserCreateWithConstraintsEndpoint);

  beforeEach(async () => {
    await env.DB.prepare("DROP TABLE IF EXISTS users").run();
    await env.DB.prepare(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        age INTEGER
      )
    `).run();
  });

  it("should return custom error for UNIQUE constraint violation", async () => {
    // First create
    await router.fetch(
      new Request("https://example.com/api/constrained-users", {
        method: "POST",
        body: JSON.stringify({ name: "First", email: "dup@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    // Duplicate
    const response = await router.fetch(
      new Request("https://example.com/api/constrained-users", {
        method: "POST",
        body: JSON.stringify({ name: "Second", email: "dup@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors[0].message).toBe("Email already exists");
    expect(data.errors[0].path).toEqual(["body", "email"]);
  });
});

describe("D1 UpdateEndpoint empty update", () => {
  // Schema where status has a default
  const StatusUserSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    email: z.string(),
    status: z.string().optional().default("active"),
  });

  class StatusUserUpdateEndpoint extends D1UpdateEndpoint {
    _meta = {
      model: {
        tableName: "status_users",
        schema: StatusUserSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";
  }

  class StatusUserReadEndpoint extends D1ReadEndpoint {
    _meta = {
      model: {
        tableName: "status_users",
        schema: StatusUserSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";
  }

  const router = fromIttyRouter(AutoRouter({ base: "/api" }), { base: "/api" });
  router.put("/status-users/:id", StatusUserUpdateEndpoint);
  router.get("/status-users/:id", StatusUserReadEndpoint);

  beforeEach(async () => {
    await env.DB.prepare("DROP TABLE IF EXISTS status_users").run();
    await env.DB.prepare(`
      CREATE TABLE status_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT DEFAULT 'active'
      )
    `).run();
    await env.DB.prepare(
      "INSERT INTO status_users (name, email, status) VALUES ('Alice', 'alice@example.com', 'inactive')",
    ).run();
  });

  it("should not overwrite existing values with defaults on partial update", async () => {
    // Update only the name, sending the required fields
    const response = await router.fetch(
      new Request("https://example.com/api/status-users/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Alice Updated", email: "alice@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    expect(response.status).toBe(200);

    // Verify the status was not overwritten with default "active"
    const readResponse = await router.fetch(
      new Request("https://example.com/api/status-users/1", { method: "GET" }),
      env,
    );
    const readData = (await readResponse.json()) as any;
    expect(readData.result.status).toBe("inactive");
    expect(readData.result.name).toBe("Alice Updated");
  });
});

describe("D1 ListEndpoint defaultOrderByDirection", () => {
  class UserListDescEndpoint extends D1ListEndpoint {
    _meta = {
      model: {
        tableName: "users",
        schema: UserSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";
    orderByFields = ["id", "name"];
    defaultOrderBy = "name";
    defaultOrderByDirection: OrderByDirection = "desc";
  }

  const router = fromIttyRouter(AutoRouter({ base: "/api" }), { base: "/api" });
  router.get("/users-desc", UserListDescEndpoint);

  beforeEach(async () => {
    await setupDatabase();
    await seedTestData();
  });

  it("should use descending order by default when defaultOrderByDirection is desc", async () => {
    const response = await router.fetch(
      new Request("https://example.com/api/users-desc", {
        method: "GET",
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result).toHaveLength(3);
    // Default order_by is "name" with default direction "desc"
    expect(data.result[0].name).toBe("Charlie");
    expect(data.result[1].name).toBe("Bob");
    expect(data.result[2].name).toBe("Alice");
  });

  it("should allow explicit override of default direction", async () => {
    const response = await router.fetch(
      new Request("https://example.com/api/users-desc?order_by_direction=asc", {
        method: "GET",
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result).toHaveLength(3);
    // Explicit asc overrides the desc default
    expect(data.result[0].name).toBe("Alice");
    expect(data.result[1].name).toBe("Bob");
    expect(data.result[2].name).toBe("Charlie");
  });
});

describe("D1 UpdateEndpoint with extra DB columns", () => {
  // Schema only defines a subset of columns in the DB
  const PartialUserSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    email: z.string(),
  });

  class PartialUserUpdateEndpoint extends D1UpdateEndpoint {
    _meta = {
      model: {
        tableName: "users_extra",
        schema: PartialUserSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";
  }

  class PartialUserReadEndpoint extends D1ReadEndpoint {
    _meta = {
      model: {
        tableName: "users_extra",
        schema: PartialUserSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";
  }

  const router = fromIttyRouter(AutoRouter({ base: "/api" }), { base: "/api" });
  router.put("/users-extra/:id", PartialUserUpdateEndpoint);
  router.get("/users-extra/:id", PartialUserReadEndpoint);

  beforeEach(async () => {
    await env.DB.prepare("DROP TABLE IF EXISTS users_extra").run();
    await env.DB.prepare(`
      CREATE TABLE users_extra (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        internal_settings TEXT DEFAULT '{}'
      )
    `).run();
    await env.DB.prepare(
      "INSERT INTO users_extra (name, email, internal_settings) VALUES ('Alice', 'alice@example.com', '{\"key\": \"value\"}')",
    ).run();
  });

  it("should update successfully when DB has columns not in the Zod schema", async () => {
    const response = await router.fetch(
      new Request("https://example.com/api/users-extra/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Alice Updated", email: "alice@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.name).toBe("Alice Updated");
  });

  it("should preserve extra DB column values after update", async () => {
    await router.fetch(
      new Request("https://example.com/api/users-extra/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Alice Updated", email: "alice@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      env,
    );

    // Verify internal_settings was not lost
    const row = await env.DB.prepare("SELECT * FROM users_extra WHERE id = 1").first();
    expect(row?.internal_settings).toBe('{"key": "value"}');
    expect(row?.name).toBe("Alice Updated");
  });
});

describe("D1 Endpoints with Composite Primary Keys", () => {
  // Schema for posts with composite key (userId, postId)
  const PostSchema = z.object({
    userId: z.number(),
    postId: z.number(),
    title: z.string(),
    content: z.string(),
  });

  class PostReadEndpoint extends D1ReadEndpoint {
    _meta = {
      model: {
        tableName: "posts",
        schema: PostSchema,
        primaryKeys: ["userId", "postId"],
      },
    };
    dbName = "DB";
  }

  class PostDeleteEndpoint extends D1DeleteEndpoint {
    _meta = {
      model: {
        tableName: "posts",
        schema: PostSchema,
        primaryKeys: ["userId", "postId"],
      },
    };
    dbName = "DB";
  }

  const router = fromIttyRouter(AutoRouter({ base: "/api" }), { base: "/api" });
  router.get("/users/:userId/posts/:postId", PostReadEndpoint);
  router.delete("/users/:userId/posts/:postId", PostDeleteEndpoint);

  beforeEach(async () => {
    await env.DB.prepare("DROP TABLE IF EXISTS posts").run();
    await env.DB.prepare(`
      CREATE TABLE posts (
        userId INTEGER NOT NULL,
        postId INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        PRIMARY KEY (userId, postId)
      )
    `).run();
    await env.DB.prepare(
      "INSERT INTO posts (userId, postId, title, content) VALUES (1, 1, 'Post 1', 'Content 1')",
    ).run();
    await env.DB.prepare(
      "INSERT INTO posts (userId, postId, title, content) VALUES (1, 2, 'Post 2', 'Content 2')",
    ).run();
    await env.DB.prepare(
      "INSERT INTO posts (userId, postId, title, content) VALUES (2, 1, 'Post 3', 'Content 3')",
    ).run();
  });

  it("should read with composite primary key", async () => {
    const response = await router.fetch(
      new Request("https://example.com/api/users/1/posts/2", {
        method: "GET",
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result.userId).toBe(1);
    expect(data.result.postId).toBe(2);
    expect(data.result.title).toBe("Post 2");
  });

  it("should return 404 for non-existent composite key", async () => {
    const response = await router.fetch(
      new Request("https://example.com/api/users/1/posts/999", {
        method: "GET",
      }),
      env,
    );

    expect(response.status).toBe(404);
  });

  it("should delete with composite primary key", async () => {
    const response = await router.fetch(
      new Request("https://example.com/api/users/1/posts/1", {
        method: "DELETE",
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify deletion
    const checkResponse = await router.fetch(
      new Request("https://example.com/api/users/1/posts/1", {
        method: "GET",
      }),
      env,
    );

    expect(checkResponse.status).toBe(404);

    // Verify other posts still exist
    const result = await env.DB.prepare("SELECT COUNT(*) as count FROM posts").first();
    expect(result?.count).toBe(2);
  });
});

describe("D1ListEndpoint Custom Pagination Parameter Names", () => {
  const ItemSchema = z.object({
    id: z.number().optional(),
    title: z.string(),
    score: z.number(),
  });

  class CustomPaginationD1ListEndpoint extends D1ListEndpoint {
    _meta = {
      model: {
        tableName: "items",
        schema: ItemSchema,
        primaryKeys: ["id"],
      },
    };
    dbName = "DB";
    filterFields = ["title"];
    orderByFields = ["id", "title", "score"];
    defaultOrderBy = "id";

    pageFieldName = "p";
    perPageFieldName = "limit";
    orderByFieldName = "sort";
    orderByDirectionFieldName = "direction";
  }

  const customPaginationRouter = fromIttyRouter(AutoRouter());
  customPaginationRouter.get("/items", CustomPaginationD1ListEndpoint);

  async function setupItemsTable() {
    await env.DB.prepare("DROP TABLE IF EXISTS items").run();
    await env.DB.prepare(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        score INTEGER NOT NULL
      )
    `).run();
  }

  async function seedItems() {
    for (let i = 1; i <= 10; i++) {
      await env.DB.prepare("INSERT INTO items (title, score) VALUES (?, ?)")
        .bind(`Item ${i}`, i * 10)
        .run();
    }
  }

  beforeEach(async () => {
    await setupItemsTable();
    await seedItems();
  });

  it("should paginate with custom parameter names", async () => {
    const response = await customPaginationRouter.fetch(
      new Request("https://example.com/items?p=2&limit=3&sort=id&direction=asc", {
        method: "GET",
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result).toHaveLength(3);
    expect(data.result_info.page).toBe(2);
    expect(data.result_info.per_page).toBe(3);
    expect(data.result_info.total_count).toBe(10);
    // Page 2 with limit 3, sorted by id asc: items 4, 5, 6
    expect(data.result[0].id).toBe(4);
    expect(data.result[2].id).toBe(6);
  });

  it("should order with custom parameter names", async () => {
    const response = await customPaginationRouter.fetch(
      new Request("https://example.com/items?sort=score&direction=desc&limit=3", {
        method: "GET",
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result).toHaveLength(3);
    // Sorted by score descending: 100, 90, 80
    expect(data.result[0].score).toBe(100);
    expect(data.result[1].score).toBe(90);
    expect(data.result[2].score).toBe(80);
  });

  it("should reflect custom parameter names in OpenAPI schema", async () => {
    const schemaReq = await customPaginationRouter.fetch(
      new Request("https://example.com/openapi.json", { method: "GET" }),
      env,
    );
    const schema = (await schemaReq.json()) as any;

    const queryParams = schema.paths["/items"].get.parameters.filter((p: any) => p.in === "query");
    const paramNames = queryParams.map((p: any) => p.name);

    expect(paramNames).toContain("p");
    expect(paramNames).toContain("limit");
    expect(paramNames).toContain("sort");
    expect(paramNames).toContain("direction");
    expect(paramNames).not.toContain("page");
    expect(paramNames).not.toContain("per_page");
    expect(paramNames).not.toContain("order_by");
    expect(paramNames).not.toContain("order_by_direction");
  });

  it("should not treat custom option fields as filters", async () => {
    const response = await customPaginationRouter.fetch(
      new Request("https://example.com/items?p=1&limit=5", {
        method: "GET",
      }),
      env,
    );

    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result).toHaveLength(5);
    expect(data.result_info.total_count).toBe(10);
  });
});
