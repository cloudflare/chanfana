import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
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
