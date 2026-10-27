import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
      miniflare: {
        d1Databases: {
          DB: "00000000-0000-0000-0000-000000000000",
        },
      },
    }),
  ],
  test: {
    include: ["test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
  },
});
