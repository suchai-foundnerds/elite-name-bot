import { DurableObject } from "cloudflare:workers";
import { createDb } from "./db/client";
import { applyMessage, renderActiveBoard } from "./handlers";
import { pushMessage, replyMessage } from "./line";

export interface DoEnv {
  DB: D1Database;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  WINDOW_MS?: string;
}

export interface SubmitInput {
  sourceId: string;
  text: string;
  replyToken: string;
}

interface Pending {
  sourceId: string;
  replyToken: string;
}

const DEFAULT_WINDOW_MS = 10_000;

/**
 * One instance per group (keyed by sourceId). Being single-threaded, it
 * serializes every write so no name is ever lost or mis-suffixed, and its
 * alarm implements the throttle window: the first `+`/`-` opens a fixed
 * window, later ones just refresh the reply token, and when the alarm fires we
 * reply once with the consolidated board.
 */
export class GroupDO extends DurableObject<DoEnv> {
  async submit(input: SubmitInput): Promise<void> {
    const db = createDb(this.env.DB);
    const action = await applyMessage(db, input.sourceId, input.text);

    if (action.type === "reply_now") {
      // Board ingest / hint — send immediately and cancel any open window.
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.delete("pending");
      await replyMessage(
        this.env.LINE_CHANNEL_ACCESS_TOKEN,
        input.replyToken,
        action.text,
      );
      return;
    }

    if (action.type === "ignore") return;

    // action.type === "debounce": remember the latest reply token; open a
    // window if one isn't already running (tumbling, not sliding).
    await this.ctx.storage.put("pending", {
      sourceId: input.sourceId,
      replyToken: input.replyToken,
    } satisfies Pending);

    if ((await this.ctx.storage.getAlarm()) === null) {
      const windowMs = Number(this.env.WINDOW_MS) || DEFAULT_WINDOW_MS;
      await this.ctx.storage.setAlarm(Date.now() + windowMs);
    }
  }

  override async alarm(): Promise<void> {
    const pending = await this.ctx.storage.get<Pending>("pending");
    await this.ctx.storage.delete("pending");
    if (!pending) return;

    const db = createDb(this.env.DB);
    const board = await renderActiveBoard(db, pending.sourceId);
    if (!board) return;

    const token = this.env.LINE_CHANNEL_ACCESS_TOKEN;
    const replied = await replyMessage(token, pending.replyToken, board);
    if (!replied) {
      // Reply token likely expired during the window — fall back to push.
      await pushMessage(token, pending.sourceId, board);
    }
  }
}
