import { and, asc, count, desc, eq } from "drizzle-orm";
import type { Db } from "./db/client";
import { participants, sessions, type Session } from "./db/schema";
import { stripSuffix } from "./parser";

/** Latest board (session) for a group, or undefined if none exists yet. */
export async function getActiveSession(
  db: Db,
  sourceId: string,
): Promise<Session | undefined> {
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sourceId, sourceId))
    .orderBy(desc(sessions.id))
    .limit(1);
  return rows[0];
}

/**
 * Create a new active board from a parsed "ELITE:" message. Names are inserted
 * in order (their ascending ids preserve that order for rendering). Returns the
 * new session id.
 */
export async function createSessionFromBoard(
  db: Db,
  sourceId: string,
  header: string,
  names: string[],
): Promise<number> {
  const [session] = await db
    .insert(sessions)
    .values({ sourceId, header })
    .returning({ id: sessions.id });
  const sessionId = session!.id;

  if (names.length > 0) {
    await db.insert(participants).values(
      names.map((name) => ({
        sessionId,
        name,
        baseName: stripSuffix(name),
      })),
    );
  }
  return sessionId;
}

/** Ordered display names for a session (starters then subs). */
export async function listNames(db: Db, sessionId: number): Promise<string[]> {
  const rows = await db
    .select({ name: participants.name })
    .from(participants)
    .where(eq(participants.sessionId, sessionId))
    .orderBy(asc(participants.id));
  return rows.map((r) => r.name);
}

/**
 * Add one name. Duplicates of the same base name get a "(n)" suffix where n is
 * how many already exist (first bare, 2nd "(1)", 3rd "(2)", ...). Returns the
 * stored display name, or null if the name was empty.
 */
export async function addName(
  db: Db,
  sessionId: number,
  rawName: string,
): Promise<string | null> {
  const base = stripSuffix(rawName);
  if (base.length === 0) return null;

  const [existing] = await db
    .select({ c: count() })
    .from(participants)
    .where(
      and(eq(participants.sessionId, sessionId), eq(participants.baseName, base)),
    );
  const n = existing?.c ?? 0;
  const display = n === 0 ? base : `${base}(${n})`;

  await db
    .insert(participants)
    .values({ sessionId, name: display, baseName: base });
  return display;
}

/**
 * Remove one participant matching `displayName` exactly (lowest id if several).
 * Returns true if a row was deleted.
 */
export async function removeName(
  db: Db,
  sessionId: number,
  displayName: string,
): Promise<boolean> {
  const name = displayName.trim();
  if (name.length === 0) return false;

  const [row] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), eq(participants.name, name)))
    .orderBy(asc(participants.id))
    .limit(1);
  if (!row) return false;

  await db.delete(participants).where(eq(participants.id, row.id));
  return true;
}
