import { describe, expect, it } from "vitest";
import { parseBoard } from "../src/parser";
import { renderBoard, STARTERS } from "../src/render";

const HEADER = "ELITE: test board\n\n💰 pay info";

function names(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`);
}

describe("renderBoard", () => {
  it("shows 25 starter slots and >=2 sub slots when empty", () => {
    const out = renderBoard(HEADER, []);
    expect(out).toContain("1.");
    expect(out).toContain("25.");
    expect(out).toContain("สำรอง (Sub)");
    // starters 1..25 all empty, subs 1. 2.
    expect(out.split("\n").filter((l) => /^\d+\.$/.test(l)).length).toBe(27);
  });

  it("fills starters in order", () => {
    const out = renderBoard(HEADER, ["ชาลี", "มาช"]);
    expect(out).toContain("1. ชาลี");
    expect(out).toContain("2. มาช");
    expect(out).toContain("3.");
  });

  it("overflows past 25 into subs (unbounded)", () => {
    const out = renderBoard(HEADER, names(27));
    expect(out).toContain(`${STARTERS}. p25`);
    const afterSub = out.slice(out.indexOf("สำรอง (Sub)"));
    expect(afterSub).toContain("1. p26");
    expect(afterSub).toContain("2. p27");
  });

  it("round-trips through parseBoard (render → parse gives same names)", () => {
    const original = names(28); // 25 starters + 3 subs
    const parsed = parseBoard(renderBoard(HEADER, original));
    expect(parsed.names).toEqual(original);
  });
});
