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
