import { fileURLToPath } from "node:url";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrationsDir = fileURLToPath(new URL("./drizzle", import.meta.url));
  const migrations = await readD1Migrations(migrationsDir);

  return {
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            // Bindings only for tests. TEST_MIGRATIONS is consumed by the setup
            // file; the rest stand in for secrets/vars. Short window so the
            // debounce alarm fires quickly.
            bindings: {
              TEST_MIGRATIONS: migrations,
              DEBUG: "1",
              WINDOW_MS: "200",
              LINE_CHANNEL_SECRET: "test-secret",
              LINE_CHANNEL_ACCESS_TOKEN: "test-token",
            },
          },
        },
      },
    },
  };
});
