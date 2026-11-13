import { Hono } from "hono";
import { AutoRouter } from "itty-router";
import { describe, expect, it } from "vitest";
import { fromHono, fromIttyRouter, getReDocUI, type ReDocOptions, type RouterOptions } from "../../src";

describe("ReDoc configuration attributes", () => {
  it("preserves the default tag and normalizes schema paths with no options", () => {
    const html = getReDocUI("/api//openapi.json/");
    expect(html).toContain('<redoc spec-url="/api/openapi.json"></redoc>');
    expect(getReDocUI("/api//openapi.json/", {})).toBe(html);
  });

  it("renders the extension filter requested in issue #376", () => {
    expect(getReDocUI("/openapi.json", { "show-extensions": "x-filter-fields" })).toContain(
      '<redoc spec-url="/openapi.json" show-extensions="x-filter-fields"></redoc>',
    );
  });

  it("preserves primitive values and omits undefined options", () => {
    const options: ReDocOptions = {
      "show-extensions": false,
      "disable-search": true,
      "scroll-y-offset": 0,
      "schema-definitions-tag-name": "",
      "only-required-in-samples": true,
      "hide-loading": undefined,
    };
    const html = getReDocUI("/openapi.json", options);
    expect(html).toContain('show-extensions="false"');
    expect(html).toContain('disable-search="true"');
    expect(html).toContain('scroll-y-offset="0"');
    expect(html).toContain('schema-definitions-tag-name=""');
    expect(html).toContain('only-required-in-samples="true"');
    expect(html).not.toContain("hide-loading");
    expect(options["show-extensions"]).toBe(false);
  });

  it("supports comma-separated extension names", () => {
    expect(getReDocUI("/openapi.json", { "show-extensions": "x-filter-fields,x-other" })).toContain(
      'show-extensions="x-filter-fields,x-other"',
    );
  });

  it("escapes attribute values and the schema URL", () => {
    const html = getReDocUI("/openapi.json?name=\"<&'>", {
      "schema-definitions-tag-name": "\"><script>alert(1)</script>&'",
    });
    expect(html).toContain('spec-url="/openapi.json?name=&quot;&lt;&amp;&#39;&gt;"');
    expect(html).toContain('schema-definitions-tag-name="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&#39;"');
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it.each([
    "",
    "showExtensions",
    "show_extensions",
    "-invalid",
    "bad--name",
    'name"',
    "bad name",
    "onclick",
    "onload",
    "spec-url",
  ])("rejects invalid or reserved attribute %j", (name) => {
    expect(() => getReDocUI("/openapi.json", { [name]: "value" })).toThrow(`Invalid ReDoc attribute: ${name}`);
  });
});

describe.each(["hono", "itty-router"] as const)("ReDoc routes with %s", (adapter) => {
  function createRouter(options: RouterOptions = {}) {
    return adapter === "hono" ? fromHono(new Hono(), options) : fromIttyRouter(AutoRouter(), options);
  }

  it("serves configured attributes at the default documentation path", async () => {
    const router = createRouter({ redoc_options: { "show-extensions": "x-filter-fields" } });
    const response = await router.fetch(new Request("http://localhost/redocs"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=UTF-8");
    expect(await response.text()).toContain(
      '<redoc spec-url="/openapi.json" show-extensions="x-filter-fields"></redoc>',
    );
  });

  it("preserves the schema URL with a base path and custom documentation URLs", async () => {
    const router = createRouter({
      base: "/api",
      redoc_url: "/reference",
      openapi_url: "/schema.json",
      redoc_options: { "show-extensions": true },
    });
    const path = adapter === "hono" ? "/api/reference" : "/reference";
    const response = await router.fetch(new Request(`http://localhost${path}`));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<redoc spec-url="/api/schema.json" show-extensions="true"></redoc>');
    expect((await router.fetch(new Request("http://localhost/api/schema.json"))).status).toBe(200);
  });

  it.each(["redoc_url", "openapi_url"] as const)("keeps ReDoc disabled when %s is null", async (option) => {
    const router = createRouter({
      [option]: null,
      redoc_options: { "show-extensions": true },
    });
    router.all("*", () => new Response("Not found", { status: 404 }));
    const response = await router.fetch(new Request("http://localhost/redocs"));
    expect(response.status).toBe(404);
  });
});
