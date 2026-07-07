/** LINE Messaging API: webhook types, signature verification, sending. */

const LINE_API = "https://api.line.me/v2/bot/message";

export interface LineSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineTextMessage {
  type: "text";
  text: string;
}

export interface LineMessageEvent {
  type: "message";
  replyToken: string;
  source: LineSource;
  message: LineTextMessage | { type: string };
}

export type LineEvent = LineMessageEvent | { type: string };

export interface LineWebhookBody {
  destination?: string;
  events?: LineEvent[];
}

/** groupId → roomId → userId; the stable key for a conversation. */
export function getSourceId(source: LineSource): string | undefined {
  return source.groupId ?? source.roomId ?? source.userId;
}

const encoder = new TextEncoder();

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Verify the `x-line-signature` header (HMAC-SHA256, base64) over the raw body. */
export async function verifySignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): Promise<boolean> {
  if (!signature) return false;
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64ToBytes(signature);
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  // crypto.subtle.verify is constant-time.
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(rawBody));
}

/** Returns true on a 2xx from LINE. */
async function send(
  accessToken: string,
  endpoint: "reply" | "push",
  payload: Record<string, unknown>,
): Promise<boolean> {
  const res = await fetch(`${LINE_API}/${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export function replyMessage(
  accessToken: string,
  replyToken: string,
  text: string,
): Promise<boolean> {
  return send(accessToken, "reply", {
    replyToken,
    messages: [{ type: "text", text }],
  });
}

export function pushMessage(
  accessToken: string,
  to: string,
  text: string,
): Promise<boolean> {
  return send(accessToken, "push", {
    to,
    messages: [{ type: "text", text }],
  });
}
