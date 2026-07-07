import { describe, expect, it } from "vitest";
import { board, postSimulate } from "./helpers";

// Every expectation below is a full, literal board string typed out in full, so
// the exact output (header, blank line, all 25 slots, sub header, sub slots,
// no trailing newline) can be read and verified by eye.

describe("full board output (exact literal string, end-to-end via /debug/simulate)", () => {
  it("empty board", async () => {
    const res = await postSimulate("full-empty", board());
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1.
2.
3.
4.
5.
6.
7.
8.
9.
10.
11.
12.
13.
14.
15.
16.
17.
18.
19.
20.
21.
22.
23.
24.
25.
สำรอง (Sub)
1.
2.`);
  });

  it("a few starters, rest empty", async () => {
    await postSimulate("full-few", board());
    const res = await postSimulate("full-few", "+ ชาลี, มาช กอฟ");
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1. ชาลี
2. มาช
3. กอฟ
4.
5.
6.
7.
8.
9.
10.
11.
12.
13.
14.
15.
16.
17.
18.
19.
20.
21.
22.
23.
24.
25.
สำรอง (Sub)
1.
2.`);
  });

  it("duplicate names get (n) suffixes", async () => {
    await postSimulate("full-dup", board());
    const res = await postSimulate("full-dup", "+ ชาลี ชาลี ชาลี");
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1. ชาลี
2. ชาลี(1)
3. ชาลี(2)
4.
5.
6.
7.
8.
9.
10.
11.
12.
13.
14.
15.
16.
17.
18.
19.
20.
21.
22.
23.
24.
25.
สำรอง (Sub)
1.
2.`);
  });

  it("exactly 25 starters, sub section still shows 2 empty slots", async () => {
    await postSimulate("full-25", board());
    const res = await postSimulate(
      "full-25",
      "+ p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14 p15 p16 p17 p18 p19 p20 p21 p22 p23 p24 p25",
    );
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1. p1
2. p2
3. p3
4. p4
5. p5
6. p6
7. p7
8. p8
9. p9
10. p10
11. p11
12. p12
13. p13
14. p14
15. p15
16. p16
17. p17
18. p18
19. p19
20. p20
21. p21
22. p22
23. p23
24. p24
25. p25
สำรอง (Sub)
1.
2.`);
  });

  it("overflows past 25 into a growing sub section (28 people)", async () => {
    await postSimulate("full-28", board());
    const res = await postSimulate(
      "full-28",
      "+ p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14 p15 p16 p17 p18 p19 p20 p21 p22 p23 p24 p25 p26 p27 p28",
    );
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1. p1
2. p2
3. p3
4. p4
5. p5
6. p6
7. p7
8. p8
9. p9
10. p10
11. p11
12. p12
13. p13
14. p14
15. p15
16. p16
17. p17
18. p18
19. p19
20. p20
21. p21
22. p22
23. p23
24. p24
25. p25
สำรอง (Sub)
1. p26
2. p27
3. p28`);
  });

  it("everyone shifts up after a middle removal", async () => {
    await postSimulate("full-remove", board());
    await postSimulate("full-remove", "+ ชาลี ชาลี ชาลี"); // ชาลี, ชาลี(1), ชาลี(2)
    const res = await postSimulate("full-remove", "- ชาลี(1)");
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1. ชาลี
2. ชาลี(2)
3.
4.
5.
6.
7.
8.
9.
10.
11.
12.
13.
14.
15.
16.
17.
18.
19.
20.
21.
22.
23.
24.
25.
สำรอง (Sub)
1.
2.`);
  });

  it("appends onto a manually filled board", async () => {
    await postSimulate("full-manual", board(["a", "b", "c", "d", "e"]));
    const res = await postSimulate("full-manual", "+ f");
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1. a
2. b
3. c
4. d
5. e
6. f
7.
8.
9.
10.
11.
12.
13.
14.
15.
16.
17.
18.
19.
20.
21.
22.
23.
24.
25.
สำรอง (Sub)
1.
2.`);
  });

  it("resets to the empty board on a new ELITE: post", async () => {
    await postSimulate("full-reset", board());
    await postSimulate("full-reset", "+ ชาลี");
    const res = await postSimulate("full-reset", board());
    expect(res.board).toBe(`ELITE: test board

💰 pay info

1.
2.
3.
4.
5.
6.
7.
8.
9.
10.
11.
12.
13.
14.
15.
16.
17.
18.
19.
20.
21.
22.
23.
24.
25.
สำรอง (Sub)
1.
2.`);
  });
});
