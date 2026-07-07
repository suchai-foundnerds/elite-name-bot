/** Pure rendering — turns a header + ordered names into the board text. */

export const STARTERS = 25;
const MIN_SUB_LINES = 2;
const SUB_HEADER = "สำรอง (Sub)";

/**
 * Render the board. `names` is the ordered list of display names; the first
 * `STARTERS` are starters (slots 1–25), the rest are subs (numbered from 1,
 * unbounded). Starter slots are always shown 1–25 (empty when unfilled); the
 * sub section always shows at least `MIN_SUB_LINES` rows, growing as needed.
 */
export function renderBoard(header: string, names: string[]): string {
  const lines: string[] = [header.trimEnd(), ""];

  for (let i = 1; i <= STARTERS; i++) {
    const name = names[i - 1];
    lines.push(name ? `${i}. ${name}` : `${i}.`);
  }

  lines.push(SUB_HEADER);
  const subs = names.slice(STARTERS);
  const subCount = Math.max(subs.length, MIN_SUB_LINES);
  for (let i = 1; i <= subCount; i++) {
    const name = subs[i - 1];
    lines.push(name ? `${i}. ${name}` : `${i}.`);
  }

  return lines.join("\n");
}
