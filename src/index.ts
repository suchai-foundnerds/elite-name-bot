import { Hono } from "hono";
import { createDb } from "./db/client";
import { applyMessage, looksLikeCommand, renderActiveBoard } from "./handlers";
import { GroupDO } from "./group-do";
import {
  getSourceId,
  verifySignature,
  type LineMessageEvent,
  type LineTextMessage,
  type LineWebhookBody,
} from "./line";

export { GroupDO };

type Bindings = {
  DB: D1Database;
  GROUP_DO: DurableObjectNamespace<GroupDO>;
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  DEBUG?: string;
  WINDOW_MS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("elite-name-bot ok"));

app.post("/webhook", async (c) => {
  const raw = await c.req.text();
  const valid = await verifySignature(
    raw,
    c.req.header("x-line-signature") ?? null,
    c.env.LINE_CHANNEL_SECRET,
  );
  if (!valid) return c.text("invalid signature", 401);

  let body: LineWebhookBody;
  try {
    body = JSON.parse(raw) as LineWebhookBody;
  } catch {
    return c.text("bad request", 400);
  }

  const jobs: Promise<unknown>[] = [];
  for (const event of body.events ?? []) {
    if (event.type !== "message") continue;
    const ev = event as LineMessageEvent;
    if (ev.message.type !== "text") continue;
    const text = (ev.message as LineTextMessage).text;
    if (!looksLikeCommand(text)) continue;
    const sourceId = getSourceId(ev.source);
    if (!sourceId) continue;

    const stub = c.env.GROUP_DO.get(c.env.GROUP_DO.idFromName(sourceId));
    jobs.push(stub.submit({ sourceId, text, replyToken: ev.replyToken }));
  }

  // Wait for DO processing (fast: schedules the window, or one immediate reply)
  // but never fail the webhook — LINE just needs a 200.
  await Promise.allSettled(jobs);
  return c.text("ok");
});

/**
 * Test-only: apply a message and return the rendered board as JSON. No
 * signature check, no throttle window (replies "now"). Enabled by DEBUG=1 so
 * logic can be verified end-to-end before a real LINE channel exists.
 */
app.post("/debug/simulate", async (c) => {
  if (c.env.DEBUG !== "1") return c.text("not found", 404);
  const input = await c.req.json<{ sourceId?: string; text?: string }>();
  if (!input.sourceId || typeof input.text !== "string") {
    return c.json({ error: "sourceId and text are required" }, 400);
  }
  const db = createDb(c.env.DB);
  const action = await applyMessage(db, input.sourceId, input.text);
  const board = await renderActiveBoard(db, input.sourceId);
  return c.json({ action, board });
});

export default app;
