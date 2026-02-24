import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

// Import the Hono app (default export from src/index.ts)
import app from "../src/index";

// Helper to make requests through the Hono app
async function request(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, init), env);
}

async function json(path: string, init?: RequestInit) {
  const res = await request(path, init);
  return { status: res.status, body: (await res.json()) as any };
}

describe("Task API", () => {
  beforeEach(async () => {
    // Reset the database before each test
    await env.DB.prepare("DROP TABLE IF EXISTS tasks").run();
    await env.DB.prepare(`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
  });

  // ── Custom endpoint ────────────────────────────────────────────────

  describe("GET /api/hello", () => {
    it("should greet with default name", async () => {
      const { status, body } = await json("/api/hello");

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Hello, world!");
    });

    it("should greet with a custom name", async () => {
      const { status, body } = await json("/api/hello?name=Chanfana");

      expect(status).toBe(200);
      expect(body.message).toBe("Hello, Chanfana!");
    });
  });

  // ── OpenAPI docs ───────────────────────────────────────────────────

  describe("OpenAPI", () => {
    it("should serve the OpenAPI JSON spec", async () => {
      const { status, body } = await json("/api/openapi.json");

      expect(status).toBe(200);
      expect(body.info.title).toBe("Task API");
      expect(body.paths["/api/tasks"]).toBeDefined();
      expect(body.paths["/api/tasks/{id}"]).toBeDefined();
    });

    it("should serve the docs page", async () => {
      const res = await request("/api/docs");

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("SwaggerUI");
    });
  });

  // ── Create ─────────────────────────────────────────────────────────

  describe("POST /api/tasks", () => {
    it("should create a task", async () => {
      const { status, body } = await json("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Buy milk", description: "From the store" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.result.title).toBe("Buy milk");
      expect(body.result.description).toBe("From the store");
      expect(body.result.completed).toBe(0);
      expect(body.result.id).toBeDefined();
      expect(body.result.created_at).toBeDefined();
    });

    it("should reject a task without a title", async () => {
      const { status, body } = await json("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ description: "Missing title" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.errors).toBeDefined();
    });
  });

  // ── Read ───────────────────────────────────────────────────────────

  describe("GET /api/tasks/:id", () => {
    it("should read an existing task", async () => {
      // Create first
      await json("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Read me" }),
        headers: { "Content-Type": "application/json" },
      });

      const { status, body } = await json("/api/tasks/1");

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.title).toBe("Read me");
    });

    it("should return 404 for non-existent task", async () => {
      const { status, body } = await json("/api/tasks/999");

      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ── Update ─────────────────────────────────────────────────────────

  describe("PUT /api/tasks/:id", () => {
    it("should update an existing task", async () => {
      // Create first
      await json("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Original" }),
        headers: { "Content-Type": "application/json" },
      });

      const { status, body } = await json("/api/tasks/1", {
        method: "PUT",
        body: JSON.stringify({ title: "Updated" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.title).toBe("Updated");
    });

    it("should return 404 for non-existent task", async () => {
      const { status, body } = await json("/api/tasks/999", {
        method: "PUT",
        body: JSON.stringify({ title: "Nope" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ── Delete ─────────────────────────────────────────────────────────

  describe("DELETE /api/tasks/:id", () => {
    it("should delete an existing task", async () => {
      // Create first
      await json("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Delete me" }),
        headers: { "Content-Type": "application/json" },
      });

      const { status, body } = await json("/api/tasks/1", { method: "DELETE" });

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      // Verify it's gone
      const { status: checkStatus } = await json("/api/tasks/1");
      expect(checkStatus).toBe(404);
    });

    it("should return 404 for non-existent task", async () => {
      const { status, body } = await json("/api/tasks/999", { method: "DELETE" });

      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // ── List ───────────────────────────────────────────────────────────

  describe("GET /api/tasks", () => {
    beforeEach(async () => {
      // Seed 3 tasks
      for (const title of ["Alpha", "Beta", "Gamma"]) {
        await json("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ title }),
          headers: { "Content-Type": "application/json" },
        });
      }
    });

    it("should list all tasks", async () => {
      const { status, body } = await json("/api/tasks");

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result).toHaveLength(3);
      expect(body.result_info.total_count).toBe(3);
    });

    it("should paginate results", async () => {
      const { status, body } = await json("/api/tasks?per_page=2&page=1");

      expect(status).toBe(200);
      expect(body.result).toHaveLength(2);
      expect(body.result_info.page).toBe(1);
      expect(body.result_info.per_page).toBe(2);
      expect(body.result_info.total_count).toBe(3);
    });

    it("should search tasks by title", async () => {
      const { status, body } = await json("/api/tasks?search=beta");

      expect(status).toBe(200);
      expect(body.result).toHaveLength(1);
      expect(body.result[0].title).toBe("Beta");
    });

    it("should order tasks", async () => {
      const { status, body } = await json("/api/tasks?order_by=title&order_by_direction=desc");

      expect(status).toBe(200);
      expect(body.result[0].title).toBe("Gamma");
      expect(body.result[2].title).toBe("Alpha");
    });
  });
});
