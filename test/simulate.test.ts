import { describe, expect, it } from "vitest";
import { board, postSimulate } from "./helpers";

describe("/debug/simulate — board logic end-to-end (real D1)", () => {
  it("ingests an empty template then adds names in order", async () => {
    const g = "group-add";
    await postSimulate(g, board());
    const res = await postSimulate(g, "+ ชาลี มาช");
    expect(res.board).toContain("1. ชาลี");
    expect(res.board).toContain("2. มาช");
    expect(res.board).toContain("3.");
  });

  it("adds multiple people with comma+space in one message", async () => {
    const g = "group-multi";
    await postSimulate(g, board());
    const res = await postSimulate(g, "+ ชาลี, มาช กอฟ");
    expect(res.board).toContain("1. ชาลี");
    expect(res.board).toContain("2. มาช");
    expect(res.board).toContain("3. กอฟ");
  });

  it("auto-suffixes duplicate names", async () => {
    const g = "group-dup";
    await postSimulate(g, board());
    await postSimulate(g, "+ ชาลี");
    await postSimulate(g, "+ ชาลี");
    const res = await postSimulate(g, "+ ชาลี");
    expect(res.board).toContain("1. ชาลี\n");
    expect(res.board).toContain("2. ชาลี(1)");
    expect(res.board).toContain("3. ชาลี(2)");
  });

  it("removes by exact display name and shifts the rest up", async () => {
    const g = "group-remove";
    await postSimulate(g, board());
    await postSimulate(g, "+ ชาลี ชาลี ชาลี"); // ชาลี, ชาลี(1), ชาลี(2)
    const res = await postSimulate(g, "- ชาลี(1)");
    expect(res.board).toContain("1. ชาลี\n");
    expect(res.board).toContain("2. ชาลี(2)");
    expect(res.board).not.toContain("ชาลี(1)");
  });

  it("overflows past 25 into the sub section", async () => {
    const g = "group-overflow";
    await postSimulate(g, board());
    const many = Array.from({ length: 26 }, (_, i) => `p${i + 1}`).join(" ");
    const res = await postSimulate(g, `+ ${many}`);
    expect(res.board).toContain("25. p25");
    const subs = res.board!.slice(res.board!.indexOf("สำรอง (Sub)"));
    expect(subs).toContain("1. p26");
  });

  it("continues from a manually filled board (manual coexistence)", async () => {
    const g = "group-manual";
    await postSimulate(g, board(["a", "b", "c", "d", "e"])); // ingest 5 manual names
    const res = await postSimulate(g, "+ f");
    expect(res.board).toContain("5. e");
    expect(res.board).toContain("6. f"); // appended after the manual 5, not overwriting
  });

  it("replies with a hint when there is no active board", async () => {
    const g = "group-none";
    const { action } = await postSimulate(g, "+ ชาลี");
    expect(action.type).toBe("reply_now");
    expect(action.text).toContain("ELITE:");
  });

  it("never loses names when adds arrive concurrently", async () => {
    const g = "group-race";
    await postSimulate(g, board());
    const people = Array.from({ length: 8 }, (_, i) => `q${i + 1}`);
    await Promise.all(people.map((p) => postSimulate(g, `+ ${p}`)));
    const res = await postSimulate(g, "?read"); // ignored → returns current board
    for (const p of people) expect(res.board).toContain(p);
  });

  it("starts a fresh empty board when a new ELITE: is posted", async () => {
    const g = "group-reset";
    await postSimulate(g, board());
    await postSimulate(g, "+ ชาลี");
    const res = await postSimulate(g, board()); // new week
    expect(res.board).not.toContain("ชาลี");
    expect(res.board).toContain("1.\n");
  });
});
