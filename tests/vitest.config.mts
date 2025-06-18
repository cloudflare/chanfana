import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // typecheck: {
    //   enabled: true,
    //   tsconfig: "tsconfig.json", // Path to your tsconfig file
    //   include: ["**/*.{test,spec}-d.ts"], // Explicitly include type-check test files
    // },
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"], // Regular test files
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.toml",
        },
      },
    },
  },
});
