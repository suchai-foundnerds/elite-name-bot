import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One row per posted board (a message starting with "ELITE:").
 * The latest session per `sourceId` is the active board for that group.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // group / room / user id from the LINE event source
    sourceId: text("source_id").notNull(),
    // verbatim header: everything from "ELITE:" up to (not incl.) the "1." line
    header: text("header").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("sessions_source_idx").on(t.sourceId, t.id)],
);

/**
 * One row per name on a board. `id` (autoincrement) is the single source of
 * ordering: render orders by id, so concurrent inserts never lose or reorder
 * names. First 25 by id are starters, the rest are subs (unbounded).
 */
export const participants = sqliteTable(
  "participants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    // display name incl. any duplicate suffix, e.g. "ชาลี(1)"
    name: text("name").notNull(),
    // name with the "(n)" suffix stripped — used to count duplicates
    baseName: text("base_name").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("participants_session_idx").on(t.sessionId, t.id)],
);

export type Session = typeof sessions.$inferSelect;
export type Participant = typeof participants.$inferSelect;
