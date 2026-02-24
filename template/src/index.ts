import { fromHono } from "chanfana";
import { Hono } from "hono";
import { Hello } from "./endpoints/hello";
import { TaskCreate } from "./endpoints/taskCreate";
import { TaskDelete } from "./endpoints/taskDelete";
import { TaskList } from "./endpoints/taskList";
import { TaskRead } from "./endpoints/taskRead";
import { TaskUpdate } from "./endpoints/taskUpdate";

// Type-safe environment bindings
export type Env = {
  Bindings: {
    DB: D1Database;
  };
};

// Create a Hono app with the base path for your API
const app = new Hono<Env>().basePath("/api");

// Wrap with chanfana to get OpenAPI generation + validation
const router = fromHono(app, {
  docs_url: "/docs",
  openapi_url: "/openapi.json",
  schema: {
    info: {
      title: "Task API",
      version: "1.0.0",
      description: "A simple task management API built with Chanfana, Hono, and D1",
    },
  },
});

// Custom endpoint (non-D1 example)
router.get("/hello", Hello);

// D1 auto-CRUD endpoints
router.post("/tasks", TaskCreate);
router.get("/tasks", TaskList);
router.get("/tasks/:id", TaskRead);
router.put("/tasks/:id", TaskUpdate);
router.delete("/tasks/:id", TaskDelete);

// Export the Hono app as the Worker default export
export default app;
