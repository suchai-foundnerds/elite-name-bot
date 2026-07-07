import { SELF } from "cloudflare:test";
import { expect } from "vitest";
import { renderBoard } from "../src/render";

export const HEADER = "ELITE: test board\n\n💰 pay info";

/** A valid ELITE board string to feed as ingest input (empty by default). */
export function board(names: string[] = []): string {
  return renderBoard(HEADER, names);
}

export interface SimResponse {
  action: { type: string; text?: string };
  board: string | null;
}

/** POST to the debug endpoint and return the parsed { action, board }. */
export async function postSimulate(
  sourceId: string,
  text: string,
): Promise<SimResponse> {
  const res = await SELF.fetch("https://bot.test/debug/simulate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId, text }),
  });
  expect(res.status).toBe(200);
  return res.json();
}
