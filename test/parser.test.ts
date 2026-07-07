import { describe, expect, it } from "vitest";
import { parseBoard, splitNames, stripSuffix } from "../src/parser";

const HEADER =
  "ELITE: ลงชื่อเล่นบาสวันจันทร์ Monday สนามชั้น 1 บีโปรบางนา 20.00-22.00 น.\n\n💰 ค่าสนามจ่ายหลังเล่น ธ.กรุงเทพ bangkok bank 920-7-035065  (สุชัย ฟูอนันต์)";

/** Build a template with the given starter/sub slot contents. */
function board(starters: string[], subs: string[] = []): string {
  const lines = [HEADER, ""];
  for (let i = 1; i <= 25; i++) lines.push(`${i}. ${starters[i - 1] ?? ""}`);
  lines.push("สำรอง (Sub)");
  const subCount = Math.max(subs.length, 2);
  for (let i = 1; i <= subCount; i++) lines.push(`${i}. ${subs[i - 1] ?? ""}`);
  return lines.join("\n");
}

describe("splitNames", () => {
  it("splits on spaces", () => {
    expect(splitNames(" ชาลี มาช กอฟ")).toEqual(["ชาลี", "มาช", "กอฟ"]);
  });
  it("splits on commas and mixed comma+space", () => {
    expect(splitNames(" ชาลี, มาช,กอฟ")).toEqual(["ชาลี", "มาช", "กอฟ"]);
  });
  it("collapses repeated separators and trims empties", () => {
    expect(splitNames("  a ,,  b  ")).toEqual(["a", "b"]);
  });
  it("returns [] for blank input", () => {
    expect(splitNames("   ")).toEqual([]);
  });
});

describe("stripSuffix", () => {
  it("removes a trailing (n)", () => {
    expect(stripSuffix("ชาลี(1)")).toBe("ชาลี");
    expect(stripSuffix("ชาลี (2)")).toBe("ชาลี");
  });
  it("leaves a bare name untouched", () => {
    expect(stripSuffix("ชาลี")).toBe("ชาลี");
  });
});

describe("parseBoard", () => {
  it("parses an empty template: header kept, no names", () => {
    const { header, names } = parseBoard(board([]));
    expect(header).toBe(HEADER);
    expect(names).toEqual([]);
  });

  it("parses a Wednesday template with a multi-line title", () => {
    const wed =
      "ELITE: ลงชื่อเล่นบาสวันพุธ Wednesday \nสนามชั้น 1 บีโปรบางนา 20.00-22.00 น.\n\n💰 ค่าสนามจ่ายหลังเล่น\n\n1.  \n2.  \nสำรอง (Sub)\n1.\n2.";
    const { header, names } = parseBoard(wed);
    expect(header).toContain("ELITE: ลงชื่อเล่นบาสวันพุธ");
    expect(header).toContain("💰");
    expect(names).toEqual([]);
  });

  it("parses a manually filled board (starters + subs, skipping empties)", () => {
    const filled = board(["ชาลี", "มาช", "", "กอฟ"], ["ซับหนึ่ง"]);
    const { header, names } = parseBoard(filled);
    expect(header).toBe(HEADER);
    // empty slot 3 skipped; sub appended after starters, in order
    expect(names).toEqual(["ชาลี", "มาช", "กอฟ", "ซับหนึ่ง"]);
  });

  it("keeps duplicate names verbatim (no auto-suffix on ingest)", () => {
    const { names } = parseBoard(board(["ชาลี", "ชาลี"]));
    expect(names).toEqual(["ชาลี", "ชาลี"]);
  });

  it("treats all numbered lines as starters when no sub marker exists", () => {
    const noSub = `${HEADER}\n\n1. a\n2. b`;
    expect(parseBoard(noSub).names).toEqual(["a", "b"]);
  });
});
