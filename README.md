# ELITE Name Bot 🏀

LINE bot สำหรับลงชื่อเล่นบาสในกลุ่ม — พิมพ์สั้น ๆ แค่ `+ ชื่อ` แทนการก้อปปี้ template ทั้งอันมาเติมชื่อเอง (ที่ทำให้ชื่อหาย/ลำดับผิดเวลาลงพร้อมกัน)

## คำสั่งในกลุ่ม

| พิมพ์ | ผลลัพธ์ |
|---|---|
| `ELITE: ...` (ทั้ง template) | เปิด board ใหม่ของกลุ่ม (สัปดาห์ใหม่). ถ้ากรอกชื่อมาในข้อความด้วย บอทจะดึงชื่อออกมาเป็นสถานะเริ่มต้น |
| `+ ชาลี` | ลงชื่อ "ชาลี" ในช่องว่างถัดไป (1→25 แล้วต่อด้วยสำรองไม่จำกัด) |
| `+ ชาลี, มาช กอฟ` | ลงหลายคนในครั้งเดียว (คั่นด้วย **คอมมาหรือเว้นวรรค**) |
| `- ชาลี` | ถอนชื่อออก (ช่องที่เหลือเลื่อนขึ้นอัตโนมัติ) |

- **ชื่อซ้ำ** จะถูกเติมเลขให้เอง: `ชาลี`, `ชาลี(1)`, `ชาลี(2)` — ถอนด้วย `- ชาลี(1)`
- **รวบตอบครั้งเดียว**: ถ้าหลายคนพิมพ์ภายใน 10 วินาที บอทจะรอแล้วตอบ board เดียวที่รวมทุกคน (ไม่สแปมกลุ่ม)
- ลงแบบเดิม (ก้อปปี้ template กรอกเอง) ก็ยังใช้ได้ — บอทอ่านข้อความ `ELITE:` ล่าสุดเป็น source of truth เสมอ แล้วคน `+` ต่อได้

## สถาปัตยกรรม

- **Hono** บน **Cloudflare Workers** (TypeScript, typesafe)
- **D1 + Drizzle** — เก็บ participants แต่ละชื่อเป็น 1 row (`id` autoincrement = ลำดับ → ชื่อไม่มีทางหาย)
- **Durable Object (`GroupDO`) + Alarm** — 1 instance ต่อ 1 กลุ่ม: serialize ทุก write (กัน race) + ทำ throttle window 10 วินาที แล้วรวบ reply ครั้งเดียว
- ตรวจ `x-line-signature` ด้วย Web Crypto (HMAC-SHA256)

```
src/
  index.ts      Hono app: POST /webhook (verify → route ไป DO), POST /debug/simulate
  group-do.ts   GroupDO: serialize + alarm debounce + reply/push
  handlers.ts   event → action (ingest / add / remove) — ใช้ทั้งจาก DO และ debug
  parser.ts     splitNames / stripSuffix / parseBoard (pure)
  render.ts     renderBoard (pure)
  repo.ts       queries: session + participants
  line.ts       verifySignature / replyMessage / pushMessage
  db/           Drizzle schema + client
```

## รันในเครื่อง (local)

```bash
npm install
cp .dev.vars.example .dev.vars     # ใส่ค่า (ตอนทดสอบ logic ยังไม่ต้องมี LINE จริงก็ได้)
npm run db:generate                # (มี migration ให้แล้วใน drizzle/)
npm run db:migrate:local           # สร้างตารางใน D1 local
npm run dev                        # wrangler dev
```

ทดสอบ logic โดยไม่ต้องมี LINE channel (ต้องตั้ง `DEBUG=1` ใน `.dev.vars`):

```bash
curl -s localhost:8787/debug/simulate -H 'content-type: application/json' \
  -d '{"sourceId":"g1","text":"ELITE: วันจันทร์\n\n1.\n2.\nสำรอง (Sub)\n1.\n2."}' | jq .board -r
curl -s localhost:8787/debug/simulate -H 'content-type: application/json' \
  -d '{"sourceId":"g1","text":"+ ชาลี มาช กอฟ"}' | jq .board -r
```

## เทสต์

```bash
npm test          # 31 tests: parser, render, signature, DB logic, DO debounce
npm run typecheck
```

เทสต์ครอบคลุม: แยกชื่อ (comma/space), suffix ชื่อซ้ำ, ลบแล้วเลื่อนขึ้น, ล้น 25 → สำรอง, อ่าน board manual, **ไม่มีชื่อหายเมื่อลงพร้อมกัน**, และ **DO รวบตอบครั้งเดียวต่อ window** (จำลอง alarm)

## Deploy (ครั้งแรก ต้องตั้ง LINE channel ก่อน)

1. **LINE Developers Console** → สร้าง provider → **Messaging API channel** → เก็บ **Channel secret** และออก **Channel access token (long-lived)**
2. ที่ channel: ปิด *Auto-reply / Greeting messages*, เปิด *Use webhook*, และเปิด *Allow bot to join group chats*
3. สร้าง D1 แล้วเอา `database_id` ไปแทนใน `wrangler.jsonc`:
   ```bash
   npx wrangler d1 create elite-name-bot
   ```
4. apply migration + ใส่ secrets ของ prod:
   ```bash
   npm run db:migrate:remote
   npx wrangler secret put LINE_CHANNEL_SECRET
   npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
   ```
5. deploy แล้วตั้ง webhook:
   ```bash
   npm run deploy
   ```
   เอา URL `https://<worker>.workers.dev/webhook` ไปใส่เป็น **Webhook URL** ใน console → กด *Verify*
6. เชิญบอทเข้ากลุ่ม → แอดมินโพสต์ template `ELITE: ...` → ทุกคนพิมพ์ `+ ชื่อ`

> `WINDOW_MS` (ใน `wrangler.jsonc` vars) ปรับความยาว throttle window ได้ (ค่าเริ่มต้น 10000 ms)
