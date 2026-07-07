import { env, runDurableObjectAlarm } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { board, postSimulate } from "./helpers";

const realFetch = globalThis.fetch;

interface LineCall {
  url: string;
  body: { replyToken?: string; to?: string; messages: { text: string }[] };
}

describe("GroupDO throttle window", () => {
  let lineCalls: LineCall[];

  beforeEach(() => {
    lineCalls = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("api.line.me")) {
        lineCalls.push({ url, body: JSON.parse(init?.body as string) });
        return new Response("{}", { status: 200 });
      }
      return realFetch(input, init);
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("coalesces several adds in one window into a single reply", async () => {
    const g = "grp-debounce";
    await postSimulate(g, board()); // create the active board (debug → no LINE call)

    const stub = env.GROUP_DO.get(env.GROUP_DO.idFromName(g));
    await stub.submit({ sourceId: g, text: "+ a", replyToken: "t1" });
    await stub.submit({ sourceId: g, text: "+ b", replyToken: "t2" });
    await stub.submit({ sourceId: g, text: "+ c", replyToken: "t3" });

    expect(lineCalls.length).toBe(0); // window still open, nothing sent yet

    expect(await runDurableObjectAlarm(stub)).toBe(true);

    // exactly one reply, latest token, all three names on the board
    expect(lineCalls.length).toBe(1);
    const call = lineCalls[0]!;
    expect(call.url).toContain("/message/reply");
    expect(call.body.replyToken).toBe("t3");
    const text = call.body.messages[0]!.text;
    expect(text).toContain("1. a");
    expect(text).toContain("2. b");
    expect(text).toContain("3. c");
  });

  it("replies immediately on ELITE: ingest with no window", async () => {
    const g = "grp-ingest";
    const stub = env.GROUP_DO.get(env.GROUP_DO.idFromName(g));
    await stub.submit({ sourceId: g, text: board(), replyToken: "tok" });

    expect(lineCalls.length).toBe(1);
    expect(lineCalls[0]!.body.replyToken).toBe("tok");
  });
});
