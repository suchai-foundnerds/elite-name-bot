import { describe, expect, it } from "vitest";
import { getSourceId, verifySignature } from "../src/line";

const SECRET = "test-secret";

/** Compute the base64 HMAC-SHA256 signature LINE would send for a body. */
async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

describe("verifySignature", () => {
  const body = JSON.stringify({ events: [] });

  it("accepts a correct signature", async () => {
    expect(await verifySignature(body, await sign(body, SECRET), SECRET)).toBe(true);
  });

  it("rejects a wrong signature", async () => {
    expect(await verifySignature(body, await sign(body, "other"), SECRET)).toBe(false);
  });

  it("rejects a missing or malformed signature", async () => {
    expect(await verifySignature(body, null, SECRET)).toBe(false);
    expect(await verifySignature(body, "not-base64!!", SECRET)).toBe(false);
  });

  it("rejects when the body was tampered with", async () => {
    const sig = await sign(body, SECRET);
    expect(await verifySignature(body + " ", sig, SECRET)).toBe(false);
  });
});

describe("getSourceId", () => {
  it("prefers group, then room, then user", () => {
    expect(getSourceId({ type: "group", groupId: "g", userId: "u" })).toBe("g");
    expect(getSourceId({ type: "room", roomId: "r", userId: "u" })).toBe("r");
    expect(getSourceId({ type: "user", userId: "u" })).toBe("u");
  });
});
