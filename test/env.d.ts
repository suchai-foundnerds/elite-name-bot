/// <reference types="@cloudflare/vitest-pool-workers" />
import type { D1Migration } from "@cloudflare/vitest-pool-workers/config";
import type { GroupDO } from "../src/group-do";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    GROUP_DO: DurableObjectNamespace<GroupDO>;
    TEST_MIGRATIONS: D1Migration[];
    DEBUG: string;
    WINDOW_MS: string;
    LINE_CHANNEL_SECRET: string;
    LINE_CHANNEL_ACCESS_TOKEN: string;
  }
}
