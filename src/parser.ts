/** Pure parsing helpers — no I/O, easy to unit test. */

// Trailing duplicate marker we add, e.g. "ชาลี(1)" or "ชาลี (2)".
const SUFFIX_RE = /\s*\(\d+\)\s*$/;

// A numbered list line: "1. name" / "25．name" (ASCII or full-width dot).
const NUMBERED_LINE_RE = /^\s*(\d+)[.．]\s*(.*)$/;

// Marks the start of the substitutes section (kept specific so a starter
// name that happens to contain "sub" isn't mistaken for the marker).
const SUB_MARKER_RE = /สำรอง|\(\s*sub\s*\)/i;

/** Split the text after `+`/`-` into individual names (comma OR whitespace). */
export function splitNames(rest: string): string[] {
  return rest
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Strip a trailing "(n)" duplicate suffix to get the base name. */
export function stripSuffix(name: string): string {
  return name.replace(SUFFIX_RE, "").trim();
}

export interface ParsedBoard {
  header: string;
  names: string[];
}

/**
 * Parse a full "ELITE:" board message into its header and the list of names
 * currently filled in (starters then subs, in order). Empty slots are skipped.
 * Names are taken verbatim — no de-duplication or suffixing here (that only
 * happens when someone adds via `+`).
 */
export function parseBoard(text: string): ParsedBoard {
  const lines = text.split(/\r?\n/);

  const firstNumberedIdx = lines.findIndex((l) => NUMBERED_LINE_RE.test(l));
  if (firstNumberedIdx === -1) {
    // No numbered list at all (e.g. a stray "ELITE:" line) — header only.
    return { header: text.trimEnd(), names: [] };
  }

  const header = lines.slice(0, firstNumberedIdx).join("\n").trimEnd();
  const subMarkerIdx = lines.findIndex(
    (l) => !NUMBERED_LINE_RE.test(l) && SUB_MARKER_RE.test(l),
  );

  const starters: string[] = [];
  const subs: string[] = [];
  for (let i = firstNumberedIdx; i < lines.length; i++) {
    const line = lines[i]!;
    const m = line.match(NUMBERED_LINE_RE);
    if (!m) continue;
    const name = m[2]!.trim();
    if (name.length === 0) continue;
    const isSub = subMarkerIdx !== -1 && i > subMarkerIdx;
    (isSub ? subs : starters).push(name);
  }

  return { header, names: [...starters, ...subs] };
}
