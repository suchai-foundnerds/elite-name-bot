import { applyD1Migrations, env } from "cloudflare:test";

// Applies the Drizzle-generated migrations to the test D1 during the seeding
// phase, so every isolated test starts from a migrated database.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
