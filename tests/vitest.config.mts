import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // typecheck: {
    //   enabled: true,
    //   tsconfig: "tsconfig.json", // Path to your tsconfig file
    //   include: ["**/*.{test,spec}-d.ts"], // Explicitly include type-check test files
    // },
    include: ["tests/**/*.{test,spec}.?(c|m)[jt]s?(x)"], // Regular test files
    coverage: {
      provider: "istanbul",
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/cli.ts"],
      reporter: ["text", "json-summary", "json"],
    },
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.toml",
        },
        miniflare: {
          d1Databases: {
            DB: "00000000-0000-0000-0000-000000000000",
          },
        },
      },
    },
  },
});
