import type { Db } from "./db/client";
import { parseBoard, splitNames } from "./parser";
import { renderBoard } from "./render";
import {
  addName,
  createSessionFromBoard,
  getActiveSession,
  listNames,
  removeName,
} from "./repo";

export const HINT_NO_SESSION =
  "ยังไม่มีรายการลงชื่อในกลุ่มนี้ — ให้แอดมินโพสต์ข้อความที่ขึ้นต้นด้วย ELITE: ก่อนนะครับ";

// The command grammar lives here (next to applyMessage, which dispatches on it).
// The webhook uses looksLikeCommand as a cheap pre-filter so it never wakes the
// Durable Object for ordinary chatter.
const COMMAND_PREFIXES = ["ELITE:", "+", "-"] as const;

export function looksLikeCommand(text: string): boolean {
  const t = text.trim();
  return COMMAND_PREFIXES.some((p) => t.startsWith(p));
}

/**
 * What the caller should do with the message.
 * - `reply_now`  → send `text` immediately (board ingest, or a hint)
 * - `debounce`   → state changed via +/- ; caller should schedule the throttle
 *                  window and reply once when it closes
 * - `ignore`     → nothing to do
 */
export type Action =
  | { type: "reply_now"; text: string }
  | { type: "debounce" }
  | { type: "ignore" };

/**
 * Apply an incoming text message to the group's board state.
 * Pure w.r.t. LINE — used by both the Durable Object and /debug/simulate.
 */
export async function applyMessage(
  db: Db,
  sourceId: string,
  text: string,
): Promise<Action> {
  const trimmed = text.trim();

  // New / manual board — parse names out and make it the active session.
  if (trimmed.startsWith("ELITE:")) {
    const { header, names } = parseBoard(text);
    await createSessionFromBoard(db, sourceId, header, names);
    return { type: "reply_now", text: renderBoard(header, names) };
  }

  const isAdd = trimmed.startsWith("+");
  const isRemove = trimmed.startsWith("-");
  if (!isAdd && !isRemove) return { type: "ignore" };

  const names = splitNames(trimmed.slice(1));
  if (names.length === 0) return { type: "ignore" };

  const session = await getActiveSession(db, sourceId);
  if (!session) return { type: "reply_now", text: HINT_NO_SESSION };

  for (const name of names) {
    if (isAdd) await addName(db, session.id, name);
    else await removeName(db, session.id, name);
  }
  return { type: "debounce" };
}

/** Render the group's current active board, or null if none exists. */
export async function renderActiveBoard(
  db: Db,
  sourceId: string,
): Promise<string | null> {
  const session = await getActiveSession(db, sourceId);
  if (!session) return null;
  const names = await listNames(db, session.id);
  return renderBoard(session.header, names);
}
