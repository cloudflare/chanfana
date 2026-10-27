import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./tests/wrangler.toml",
      },
      miniflare: {
        d1Databases: {
          DB: "00000000-0000-0000-0000-000000000000",
        },
      },
    }),
  ],
  test: {
    // typecheck: {
    //   enabled: true,
    //   tsconfig: "tsconfig.json", // Path to your tsconfig file
    //   include: ["**/*.{test,spec}-d.ts"], // Explicitly include type-check test files
    // },
    include: ["tests/**/*.{test,spec}.?(c|m)[jt]s?(x)"], // Regular test files
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      exclude: ["src/cli.ts"],
      reporter: ["text", "json-summary", "json"],
    },
  },
});
