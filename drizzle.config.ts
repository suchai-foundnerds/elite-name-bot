import { defineConfig } from "drizzle-kit";

// Generates SQL migrations into ./drizzle, applied to D1 via
// `wrangler d1 migrations apply elite-name-bot`.
export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
