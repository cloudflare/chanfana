import { env } from "cloudflare:test";
import { AutoRouter } from "itty-router";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { D1ListEndpoint, fromIttyRouter, ListEndpoint } from "../../src";
import type { ListFilters } from "../../src";

const RowSchema = z.object({
  id: z.number(),
  title: z.string(),
});

const rowsMeta = {
  model: {
    tableName: "max_per_page_rows",
    schema: RowSchema,
    primaryKeys: ["id"],
  },
};

class DefaultD1ListEndpoint extends D1ListEndpoint {
  _meta = rowsMeta;
}

class LargeD1ListEndpoint extends D1ListEndpoint {
  _meta = rowsMeta;
  maxPerPage = 200;
}

class SmallD1ListEndpoint extends D1ListEndpoint {
  _meta = rowsMeta;
  maxPerPage = 10;
}

class SmallListEndpoint extends ListEndpoint {
  _meta = rowsMeta;
  maxPerPage = 10;

  override async list(filters: ListFilters) {
    return {
      result: [],
      result_info: { per_page: filters.options.per_page },
    };
  }
}

class CustomDefaultListEndpoint extends ListEndpoint {
  _meta = rowsMeta;
  maxPerPage = 50;
  defaultPerPage = 30;

  override async list(filters: ListFilters) {
    return {
      result: [],
      result_info: { per_page: filters.options.per_page },
    };
  }
}

describe("ListEndpoint maxPerPage", () => {
  const router = fromIttyRouter(AutoRouter());
  router.get("/default", DefaultD1ListEndpoint);
  router.get("/large", LargeD1ListEndpoint);
  router.get("/small", SmallD1ListEndpoint);
  router.get("/small-base", SmallListEndpoint);
  router.get("/custom-default", CustomDefaultListEndpoint);

  beforeEach(async () => {
    await env.DB.prepare("DROP TABLE IF EXISTS max_per_page_rows").run();
    await env.DB.prepare("CREATE TABLE max_per_page_rows (id INTEGER PRIMARY KEY, title TEXT NOT NULL)").run();
    const statements = [];
    for (let i = 1; i <= 160; i++) {
      statements.push(env.DB.prepare("INSERT INTO max_per_page_rows (id, title) VALUES (?, ?)").bind(i, `Row ${i}`));
    }
    await env.DB.batch(statements);
  });

  it("accepts per_page above 100 when maxPerPage is raised", async () => {
    const response = await router.fetch(new Request("https://example.com/large?per_page=150"), env);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result).toHaveLength(150);
    expect(data.result_info.per_page).toBe(150);
  });

  it("rejects per_page above the default maxPerPage of 100", async () => {
    const response = await router.fetch(new Request("https://example.com/default?per_page=101"), env);
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors[0].code).toBe(7001);
  });

  it("accepts per_page of exactly 100 by default", async () => {
    const response = await router.fetch(new Request("https://example.com/default?per_page=100"), env);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result).toHaveLength(100);
  });

  it("keeps the default page size of 20", async () => {
    const response = await router.fetch(new Request("https://example.com/default"), env);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result).toHaveLength(20);
    expect(data.result_info.per_page).toBe(20);
  });

  it("rejects per_page above a lowered maxPerPage", async () => {
    const response = await router.fetch(new Request("https://example.com/small?per_page=11"), env);
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors[0].code).toBe(7001);
  });

  it("caps the default page size at maxPerPage when maxPerPage is below 20", async () => {
    const d1Response = await router.fetch(new Request("https://example.com/small"), env);
    const d1Data = (await d1Response.json()) as any;

    expect(d1Response.status).toBe(200);
    expect(d1Data.result).toHaveLength(10);
    expect(d1Data.result_info.per_page).toBe(10);

    const baseResponse = await router.fetch(new Request("https://example.com/small-base"), env);
    const baseData = (await baseResponse.json()) as any;

    expect(baseResponse.status).toBe(200);
    expect(baseData.result_info.per_page).toBe(10);
  });

  it("uses a custom defaultPerPage", async () => {
    const response = await router.fetch(new Request("https://example.com/custom-default"), env);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.result_info.per_page).toBe(30);
  });

  it("documents maxPerPage and the effective default in the OpenAPI schema", async () => {
    const response = await router.fetch(new Request("https://example.com/openapi.json"), env);
    const schema = (await response.json()) as any;

    const perPageSchema = (path: string) =>
      schema.paths[path].get.parameters.find((p: any) => p.in === "query" && p.name === "per_page").schema;

    expect(perPageSchema("/default").maximum).toBe(100);
    expect(perPageSchema("/default").default).toBe(20);
    expect(perPageSchema("/large").maximum).toBe(200);
    expect(perPageSchema("/large").default).toBe(20);
    expect(perPageSchema("/small").maximum).toBe(10);
    expect(perPageSchema("/small").default).toBe(10);
    expect(perPageSchema("/custom-default").maximum).toBe(50);
    expect(perPageSchema("/custom-default").default).toBe(30);
  });
});
