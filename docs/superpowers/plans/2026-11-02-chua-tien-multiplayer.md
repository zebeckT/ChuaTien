# Chùa Tiên Multiplayer Hall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the simulated single-user "phòng live" into a real multi-user hall: up to 200 people (4 halls × 50 cushions) see each other as blocky 3D avatars with chat bubbles, served from a CDN plus one small Node.js Socket.IO server.

**Architecture:** Static client (`client/`) deployed to Cloudflare Pages; one Node.js process (`server/`) holds all hall state in memory and relays chat, actions and presence per hall via Socket.IO rooms. Constants and seat coordinates live in `client/shared/` as plain ES modules imported by both browser and server. No database, no accounts.

**Tech Stack:** Node.js ≥ 20 (ESM), Express 4, Socket.IO 4.7.x (server + `socket.io-client` for tests), `node:test`, Three.js r128 (already used, global script), plain HTML/CSS/JS modules (no bundler), Fly.io, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-11-02-chua-tien-multiplayer-design.md`

## Global Constraints

- 4 halls × 50 seats; hard cap 200 concurrent.
- Name: trim, strip control/zero-width chars, NFC-normalize, length 1–20 (counted after NFC); profanity → rejected (`invalid_name`). Duplicate names allowed.
- Colour: one of exactly 8 fixed colours; anything else → default colour.
- Chat: ≤ 100 chars, ≤ 1 message / 3 s per person; profanity masked as `***`; too fast → `error {code:'rate_limited'}`, not broadcast.
- Actions `bow|gomo|flower|heart`: heart ≤ 10/s per person (excess silently dropped); others ≤ 1/s.
- Disconnect grace 30 s keeps the seat; `sessionId` lives in `sessionStorage` only.
- Counters `{flowers, bells}` per hall, in memory, broadcast batched at most every 500 ms.
- All UI copy Vietnamese; follow `design-system/chua-tien/MASTER.md` tokens; buttons ≥ 44px; sound off by default; honour `prefers-reduced-motion`.
- Removed entirely: xu/prices, leaderboard, countdown timer, `STREAM_EVENTS`, `DEVOTEES_CONFIG`, fake share toast, hard-coded `.seat-badge-tag`s.
- Full message copy: `Chính điện đã đủ chỗ, xin vui lòng quay lại sau ít phút`.

## Review Focus

1. **Duplicated browser tab** copies `sessionStorage`, so a second tab arrives with a `sessionId` whose owner is still connected → it must get a *new* session and seat; the original tab keeps its seat. (Task 3 test.)
2. **Junk names**: only spaces, only zero-width chars, 20 Vietnamese chars typed in decomposed form (NFD) → whitespace/zero-width rejected; NFD name accepted and stored NFC. (Task 2 test.)
3. **Malformed or out-of-order client events** (`chat` before `join`, `action {type:'xyz'}`, payload `null`/number) → ignored, server keeps running, sender gets no broadcast. (Task 4 test.)
4. **Server restart** while people sit: their `sessionId` is unknown to the new process → `join` treats it as a fresh join (new seat), client leaves the reconnect overlay normally. (Task 3 test + Task 6 client handling.)
5. **Hall full while a seat is held in grace**: the held seat counts as taken; 201st joiner gets `full`; after `sweep` past 30 s a seat frees up. (Task 3 test.)

---

## File Structure

```
client/                      ← deployed to Cloudflare Pages (moved from repo root)
  index.html                 rewritten: entry screen + hall screen
  styles.css                 trimmed + new entry/bubble/feed styles
  config.js                  window.CHUA_TIEN_SERVER (WebSocket server URL; '' = same origin)
  assets/chua_tien_live.webp (+ .jpg fallback)
  shared/constants.js        limits, colours, action types (browser + server)
  shared/seats.js            50 seat coordinates, nearest-altar first
  js/main.js                 boot: wires entry → net → scene/ui
  js/net.js                  Socket.IO client wrapper, sessionId, reconnect
  js/scene.js                Three.js hall: floor, cushions, blocky avatars, animations
  js/ui.js                   HUD: entry form, counters, feed, bubbles/name tags, mute menu, overlays
  js/audio.js                bell + wooden-fish synth (moved out of app.js)
server/
  package.json, Dockerfile, fly.toml
  src/index.js               Express + Socket.IO bootstrap, /health, static serving, origin check
  src/guards.js              validateName, normalizeColor, sanitizeChat, ClientLimits
  src/profanity.js           containsProfanity, maskProfanity
  src/profanity-vi.json      word list
  src/halls.js               HallManager (pure, injectable clock)
  src/socket.js              attachSocketHandlers(io, manager, opts)
  test/*.test.js
  scripts/loadtest.js
docs/deploy.md
```

`app.js` at the repo root is deleted once its reusable parts (audio, bow animation, offering particles) are moved in Tasks 6–8.

---

### Task 1: Repo scaffold and shared modules

**Files:**
- Create: `.gitignore`, `client/shared/constants.js`, `client/shared/seats.js`, `client/config.js`, `server/package.json`, `server/test/shared.test.js`
- Move: `index.html`, `styles.css`, `app.js`, `assets/` → `client/`

**Interfaces:**
- Produces `client/shared/constants.js`:
  `HALL_COUNT=4, SEATS_PER_HALL=50, NAME_MAX=20, CHAT_MAX=100, CHAT_INTERVAL_MS=3000, HEART_MAX_PER_SEC=10, ACTION_INTERVAL_MS=1000, GRACE_MS=30000, COUNTER_FLUSH_MS=500, BUBBLE_MS=5000, ACTION_TYPES=['bow','gomo','flower','heart'], COLORS` (array of 8 `'#rrggbb'` strings, distinguishable on `#120705`; first = `'#E3A21A'`), `DEFAULT_COLOR = COLORS[0]`, `FULL_MESSAGE` (copy from Global Constraints).
- Produces `client/shared/seats.js`: `export const SEATS: Array<{seat:number, x:number, z:number}>` — 50 entries, `seat` 1..50, ordered by ascending distance to the altar point `(0, -3)`; laid out symmetrically on both sides of the carpet (`|x| ≥ 0.9`), rows receding toward the altar. Generated by `function buildSeats({cols, rows, xStart, xStep, zStart, zStep})` kept in the file so Task 7 can retune spacing to the photo.
- `server/package.json`: `"type":"module"`, `"engines":{"node":">=20"}`, deps `express@^4`, `socket.io@^4.7`; dev dep `socket.io-client@^4.7`; scripts `start: node src/index.js`, `test: node --test test/`, `loadtest: node scripts/loadtest.js`.

- [ ] **Step 1:** `git init`; `.gitignore` with `node_modules/`, `.superpowers/`, `.env`. Move the four items into `client/` with `git mv`-equivalent (`mv`, repo is new). `cd server && npm install`.
- [ ] **Step 2: Write the failing test** `server/test/shared.test.js`:
  - `SEATS.length === 50`, seat numbers are exactly 1..50.
  - distances to `(0,-3)` are non-decreasing along the array.
  - no two seats closer than `0.6` units; every `|x| >= 0.9`.
  - `COLORS.length === 8`, all match `/^#[0-9A-F]{6}$/i`, all unique; `ACTION_TYPES` deep-equals `['bow','gomo','flower','heart']`.
- [ ] **Step 3:** Run `npm test` in `server/` → FAIL (modules missing).
- [ ] **Step 4:** Implement both shared modules. `client/config.js`: `window.CHUA_TIEN_SERVER = '';`.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6: Commit** `chore: scaffold client/server layout and shared constants`.

---

### Task 2: Input guards and profanity filter

**Files:**
- Create: `server/src/guards.js`, `server/src/profanity.js`, `server/src/profanity-vi.json`
- Test: `server/test/guards.test.js`, `server/test/profanity.test.js`

**Interfaces:**
- `containsProfanity(text: string): boolean`, `maskProfanity(text: string): string` — case-insensitive, matches both accented and accent-stripped forms (strip with NFD + remove `\p{M}`, map `đ→d`), whole-word match (Unicode word boundaries via `(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])`, flag `u`). Each matched word replaced by `***` in the original string.
- `validateName(raw: unknown): {ok:true, name:string} | {ok:false, code:'invalid_name'}`
- `normalizeColor(raw: unknown): string` — returns the matching entry of `COLORS` (case-insensitive) or `DEFAULT_COLOR`.
- `sanitizeChat(raw: unknown): string | null` — NFC, strip control/zero-width (`[\p{Cc}​-‍⁠﻿]`), trim, cut to `CHAT_MAX` code points, mask profanity; `null` if empty or not a string.
- `class ClientLimits { constructor(now = Date.now); allowChat(): boolean; allowAction(type: string): boolean }` — chat: 1 per `CHAT_INTERVAL_MS`; heart: sliding 1 s window, ≤ `HEART_MAX_PER_SEC`; other actions: 1 per `ACTION_INTERVAL_MS` each; unknown type → `false`.

- [ ] **Step 1: Write failing tests**
  - profanity: `containsProfanity('đm')`, `('dm')`, `('ĐỊT')` true; `('Nam mô A Di Đà Phật')` false; `('admin')` false (word boundary); `maskProfanity('xin chào đm nhé') === 'xin chào *** nhé'`.
  - `validateName('  Minh An  ')` → `{ok:true,name:'Minh An'}`; `'   '`, `'​​'`, `''`, `42`, `null`, a 21-char name, a profane name → `{ok:false,code:'invalid_name'}`; NFD `'Diệu Mai'.normalize('NFD')` → ok with `name === 'Diệu Mai'` (NFC); exactly 20 chars → ok.
  - `normalizeColor(COLORS[3].toLowerCase()) === COLORS[3]`; `normalizeColor('red')`, `(undefined)` → `DEFAULT_COLOR`.
  - `sanitizeChat('a'.repeat(150)).length === 100`; `sanitizeChat('  ')`, `(5)` → `null`; profane word masked.
  - `ClientLimits` with fake clock: chat at t=0 true, t=2999 false, t=3000 true; 10 hearts at t=0 true, 11th false, at t=1001 true again; `bow` t=0 true, t=500 false, `gomo` t=500 true; `allowAction('xyz')` false.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement. Seed `profanity-vi.json` with ~40 common Vietnamese vulgar terms and their teen-code abbreviations (`dm`, `dcm`, `vcl`, `vl`, `cc`, `đụ`, `địt`, `lồn`, `buồi`, `cặc`, `đĩ`, …), stored lower-case.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(server): input validation, rate limits, profanity filter`.

---

### Task 3: HallManager

**Files:**
- Create: `server/src/halls.js`
- Test: `server/test/halls.test.js`

**Interfaces:**
- `class HallManager { constructor({ now = Date.now, graceMs = GRACE_MS, randomId = () => crypto.randomUUID() } = {}) }`
- `join({name, color, sessionId?}): {status:'joined', hallId, seat, sessionId, resumed:boolean} | {status:'full'}` — inputs already validated. Resume only if `sessionId` exists **and** is disconnected (in grace); then mark connected, return same hall/seat, `resumed:true`. If `sessionId` exists and is connected (duplicated tab) or unknown → fresh join with a new `randomId()`. Fresh join: lowest-numbered hall with a free seat, lowest free seat number (seat numbers already nearest-altar first). Held (grace) seats are taken.
- `disconnect(sessionId): void` — marks disconnected at `now()`.
- `leave(sessionId): {hallId, seat} | null` — immediate removal.
- `sweep(): Array<{hallId, seat}>` — removes sessions disconnected for ≥ `graceMs`.
- `getSession(sessionId): {hallId, seat, name, color, connected} | undefined`
- `occupants(hallId): Array<{seat, name, color}>` (sorted by seat), `count(hallId): number`
- `addCounter(hallId, key: 'flowers'|'bells', n = 1): void`, `counters(hallId): {flowers, bells}`
- `hallId` values: `'hall-1'..'hall-4'`; export `hallNumber(hallId): number`.

- [ ] **Step 1: Write failing tests**
  - first 50 joins → `hall-1`, seats 1..50; 51st → `hall-2` seat 1.
  - 200 joins fill all; 201st → `{status:'full'}`.
  - leave seat 7 in hall-1, next join → hall-1 seat 7.
  - disconnect at t=0; join with same sessionId at t=29_999 → `resumed:true`, same seat.
  - disconnect at t=0; `sweep()` at t=29_999 returns `[]`; at t=30_000 returns `[{hallId:'hall-1',seat:1}]`; later join with that sessionId → fresh (`resumed:false`, new sessionId).
  - **Review Focus 1:** connected session A; join with A's sessionId → different seat, different sessionId; A still occupies its seat.
  - **Review Focus 4:** join with never-seen sessionId `'old-from-previous-process'` → fresh join, returned sessionId ≠ supplied.
  - **Review Focus 5:** fill 200, disconnect one; join → `full`; advance 30 s, `sweep()`, join → joined in the freed seat.
  - counters start `{flowers:0,bells:0}` and are per hall.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement with a `Map<sessionId, session>` and per-hall `Map<seat, sessionId>`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(server): hall and seat manager with reconnect grace`.

---

### Task 4: Socket server

**Files:**
- Create: `server/src/socket.js`, `server/src/index.js`
- Test: `server/test/socket.test.js`

**Interfaces:**
- Consumes Tasks 2–3.
- `attachSocketHandlers(io, manager, { flushMs = COUNTER_FLUSH_MS, sweepMs = 5000 } = {}): { stop(): void }`
- `createServer({ port = process.env.PORT || 3000, allowedOrigins = (process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean), serveStatic = process.env.SERVE_STATIC !== '0' } = {}): Promise<{ url, close(): Promise<void> }>` exported from `index.js`; module runs it when executed directly.
- Events exactly as spec §6.3. Per socket: one `ClientLimits`, `socket.data.sessionId`. On `join`: validate name (`invalid_name` error on failure), normalize colour, `manager.join`; on `full` emit `full` and keep socket open; on success `socket.join(hallId)`, emit `joined {hallId, hallNumber, seat, sessionId, you:{seat,name,color}, occupants, counters}`, and if `!resumed` broadcast `occupant:join` to the rest of the room. A second `join` on an already-joined socket is ignored.
- `chat`/`action` before join, non-object payloads, unknown action types → ignored silently (no throw). Rate-limited chat → `error {code:'rate_limited', message:'Xin chậm lại một chút 🙏'}` to sender only. `flower` → `addCounter('flowers')`; `heart` → `addCounter('bells')`; mark hall dirty; flush timer emits `counters` to dirty halls only.
- `disconnect` → `manager.disconnect`; sweep timer emits `occupant:leave` for swept seats. A `leave` event (user taps "Rời chùa") → `manager.leave` + `occupant:leave` immediately.
- `index.js`: Express app, `GET /health` → `200 {ok:true, people:<total>}`; `express.static('../client')` when `serveStatic`; Socket.IO `cors.origin` = `allowedOrigins` when non-empty, else same-origin only; `maxHttpBufferSize: 4096`.

- [ ] **Step 1: Write failing tests** (start `createServer({port:0})`, connect `socket.io-client` instances, short `flushMs`/`sweepMs` + injected manager clock where needed):
  - A joins, B joins → B's `joined.occupants` contains A; A receives `occupant:join` with B's seat/name/colour.
  - A sends `chat {text:'Nam mô A Di Đà Phật'}` → B receives `chat {seat:A.seat, text:'Nam mô A Di Đà Phật'}`; A's second chat within 3 s → A gets `error rate_limited`, B receives nothing.
  - A sends `action {type:'flower'}` → B receives `action {seat, type:'flower'}` and, within 1 s, `counters {flowers:1, bells:0}`.
  - **Review Focus 3:** fresh socket emits `chat {text:'hi'}` before join, `action {type:'xyz'}`, `chat null`, `action 5` → no events reach B, `GET /health` still 200.
  - join with name `'   '` → `error {code:'invalid_name'}`, no `joined`.
  - A disconnects → B receives `occupant:leave {seat}` after grace (test with `graceMs` 100 ms, `sweepMs` 20 ms); A reconnecting with its sessionId inside grace gets the same seat and B receives no `occupant:join`.
  - Socket in hall-2 does not receive hall-1 chat.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `socket.js` and `index.js`.
- [ ] **Step 4:** `npm test` → PASS. Also `npm start` and `curl localhost:3000/health` → `{"ok":true,"people":0}`.
- [ ] **Step 5: Commit** `feat(server): socket.io hall protocol and http entrypoint`.

---

### Task 5: Load test

**Files:**
- Create: `server/scripts/loadtest.js`

**Interfaces:**
- CLI: `node scripts/loadtest.js [url=http://localhost:3000] [clients=200] [seconds=60]`. Opens `clients` sockets (staggered over 5 s), each joins with name `Khách N`, chats every 5–10 s (random) with a timestamp in the text, sends 1–5 hearts every 3 s. Measures chat latency (send → receipt by another client in the same hall). Prints `joined=<n> full=<n> errors=<n> p50=<ms> p95=<ms> max=<ms>` and exits non-zero if `joined < min(clients,200)` or `p95 > 300`.

- [ ] **Step 1:** Implement script.
- [ ] **Step 2:** Run server (`npm start`) and `npm run loadtest` with 200 clients / 60 s. Expected: `joined=200 full=0 errors=0`, p95 < 300 ms. Note server RSS from `/health` (add `rssMb` field to `/health` in this task) < 200 MB.
- [ ] **Step 3:** Run with 220 clients → `joined=200 full=20`.
- [ ] **Step 4: Commit** `test(server): 200-client load test script`.

---

### Task 6: Client networking and entry screen

**Files:**
- Create: `client/js/net.js`, `client/js/ui.js` (entry + overlay part), `client/js/main.js`, `client/js/audio.js`
- Modify: `client/index.html` (rewrite body), `client/styles.css`
- Delete: `client/app.js` (after moving `initAudio`, `playTempleBell`, `playWoodenFish` into `audio.js`)

**Interfaces:**
- `net.js`: `createConnection({ serverUrl }): { join({name,color}): void, chat(text), action(type), leave(), on(event, handler) }` — uses global `io` from `https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js`. Stores `sessionId` from `joined` in `sessionStorage['chuatien.session']` (wrapped in try/catch). On socket reconnect, automatically re-emits `join` with the last name/colour and stored sessionId (covers Review Focus 4: server restart → fresh seat, overlay closes on `joined`). Emits local pseudo-events `'connection:lost'`, `'connection:restored'`, `'connection:expired'` (no `joined` within `GRACE_MS` of loss).
- `ui.js` (this task's part): `showEntry({onSubmit({name,color})})`, `showEntryError(message)`, `showFull()`, `showReconnecting(bool)`, `showHall()`.
- `audio.js`: `initAudio()`, `playTempleBell()`, `playWoodenFish()`, `setMuted(bool)`, `isMuted()` — muted by default.
- `main.js`: reads `window.CHUA_TIEN_SERVER` (from `config.js`), boots entry → `join` → on `joined` calls `showHall()` and hands state to scene/ui (Tasks 7–8 fill these in; this task logs `joined` payload to the console).
- Entry screen per spec §6.5: blurred photo background, "Chùa Tiên" title (Playfair Display), name input (`maxlength=20`), 8 colour swatches as radio buttons (keyboard accessible, ≥ 44px), live avatar preview (a CSS-drawn block figure tinted with the chosen colour), button `Vào chùa 🙏` (disabled until name non-blank). `invalid_name` → `Tên chưa phù hợp, xin chọn tên khác`. `full` → `FULL_MESSAGE` with a `Thử lại` button.

- [ ] **Step 1:** Implement; remove all xu/leaderboard/timer/gift-price markup from `index.html`.
- [ ] **Step 2: Verify manually:** `cd server && npm start`, open `http://localhost:3000` in two tabs; both join, console shows `joined` with seats 1 and 2. Enter `'   '` → button disabled; enter a profane name → error copy shown. Stop server while a tab is in the hall → "Đang kết nối lại…" overlay; restart server → overlay closes and console shows a new `joined`.
- [ ] **Step 3: Commit** `feat(client): entry screen, connection layer, audio module`.

---

### Task 7: Hall scene — floor and blocky avatars

**Files:**
- Create: `client/js/scene.js`
- Modify: `client/js/main.js`, `client/index.html` (canvas element), `client/styles.css`

**Interfaces:**
- `createHallScene(canvas: HTMLCanvasElement, { isMobile: boolean }): { setOccupants(list: Array<{seat,name,color}>, youSeat: number), addOccupant(o), removeOccupant(seat), playAction(seat, type), seatScreenPosition(seat): {x, y, visible} | null, onSeatTap(handler(seat)), resize(), dispose() }`
- Camera/lighting start from the existing `initThreeScene` values. Floor: opaque plane + carpet + gold borders that fully hide the photographed devotees (photo bottom ~42%); a gradient/step mesh at the photo boundary so the join is seamless. Retune `buildSeats` params in `shared/seats.js` so all 50 seats are on-screen at 390×844 and 360×740 viewports (rerun Task 1 tests after).
- Avatar: blocky low-poly figure (head cube, torso box, folded-hands box, crossed-legs box) on a cushion cylinder; shared geometries; one material per colour (cache by hex). Own cushion `#E64A19`, others `#E3A21A`; empty seats not rendered.
- `playAction`: `bow` (reuse `bowDevotee` tween), `flower` (petal particles toward the altar, adapted `triggerOfferingEffect`), `gomo` (ripple ring at the avatar), `heart` (floating heart from the avatar's screen position). All disabled/simplified under `prefers-reduced-motion`.
- Mobile: `renderer.shadowMap.enabled = !isMobile`, `setPixelRatio(Math.min(devicePixelRatio, 2))`.

- [ ] **Step 1:** Implement scene and wire `joined`/`occupant:join`/`occupant:leave`/`action` events in `main.js`.
- [ ] **Step 2: Verify manually:** run server + `node scripts/loadtest.js http://localhost:3000 49 120` and one browser tab (DevTools device mode 360×740): 50 avatars visible, none overlapping, none over a photographed person, own cushion highlighted; DevTools Performance shows ≥ 50 fps on 4× CPU throttle without shadows. Tap a flower in a second tab → petals rise from that avatar in the first tab.
- [ ] **Step 3: Commit** `feat(client): 3D hall floor and blocky avatars`.

---

### Task 8: HUD — bubbles, names, counters, feed, actions, mute

**Files:**
- Modify: `client/js/ui.js`, `client/js/main.js`, `client/styles.css`, `client/index.html`
- Create: `client/assets/chua_tien_live.webp`

**Interfaces:**
- Consumes `createHallScene().seatScreenPosition`, `net` events.
- `ui.js` adds: `showBubble(seat, text)` (DOM bubble positioned each frame from `seatScreenPosition`, removed after `BUBBLE_MS`, new message replaces the old one for that seat; skipped if seat muted), `setNameVisible(seat, bool)` (names shown for own seat always, while speaking, and 3 s after tap), `setCounters({flowers, bells})`, `pushFeed(text)` (max 3 lines, each fades after 6 s), `setHallLabel(hallNumber, count)` → `🏯 Chính điện N · X/50`, `openSeatMenu(seat, {name, muted, onToggleMute})` with `Ẩn tin nhắn người này` / `Hiện lại tin nhắn`, `showToast(text)` for `rate_limited`.
- Bottom bar: input (`maxlength=100`, placeholder `Niệm Phật, điểm danh…`), buttons 🪷 dâng hoa, 🪵 gõ mõ (also Space key when input not focused), 🙏 vái lạy, ❤️ thả tim (hold-to-repeat). Each button plays local feedback immediately and sends `action`. Top-right: sound toggle (`audio.setMuted`) and menu with `Rời chùa` → `net.leave()` and back to entry.
- Feed copy: `✨ {name} vừa vào chùa`, `{name} đã rời chùa`, `🪷 {name} dâng hoa`, `🙏 {name} vái lạy`. (No feed lines for hearts/gõ mõ — too frequent.)
- Image: convert with `npx --yes sharp-cli -i client/assets/chua_tien_live.jpg -o client/assets/chua_tien_live.webp -f webp -q 72 resize 1080`; target < 250 KB; `<picture>` with JPG fallback.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify manually** with 2–3 tabs: bubble appears above the right avatar and fades in ~5 s; second message within 3 s → toast `Xin chậm lại một chút 🙏`; profane word shows as `***`; mute a person → their bubbles stop for this tab only; counters increment in all tabs; feed shows joins/leaves; `Rời chùa` frees the seat in other tabs immediately; WebP served (Network tab) and < 250 KB.
- [ ] **Step 3: Commit** `feat(client): chat bubbles, counters, feed, actions and mute`.

---

### Task 9: Deployment

**Files:**
- Create: `server/Dockerfile`, `server/fly.toml`, `docs/deploy.md`
- Modify: `CLAUDE.md` (real commands + architecture), `client/config.js` comment

**Interfaces:**
- Dockerfile: `node:20-alpine`, `npm ci --omit=dev`, copies `server/` and `client/shared/` (server imports `../client/shared/*`; build context = repo root, `fly deploy --config server/fly.toml --dockerfile server/Dockerfile` from root), `ENV SERVE_STATIC=0`, `CMD ["node","src/index.js"]`.
- `fly.toml`: region `sin` (Singapore, nearest to Vietnam), `internal_port = 3000`, `auto_stop_machines = false`, `min_machines_running = 1`, 256 MB shared CPU, HTTP check on `/health`.
- `docs/deploy.md` (Vietnamese, step by step): install flyctl, `fly launch --no-deploy`, `fly secrets set ALLOWED_ORIGINS=https://<project>.pages.dev[,https://custom-domain]`, `fly deploy`; Cloudflare Pages: connect repo or `npx wrangler pages deploy client`, set `client/config.js` to `https://<app>.fly.dev`; custom domain optional; how to run `npm run loadtest https://<app>.fly.dev 200 60` against production; local dev = `cd server && npm install && npm start` → `http://localhost:3000`.

- [ ] **Step 1:** Write files; `docker build -f server/Dockerfile .` succeeds (skip if Docker not installed and say so).
- [ ] **Step 2:** `npm test` in `server/` → all PASS.
- [ ] **Step 3: Commit** `chore: deployment config and docs`.
- [ ] **Step 4:** Actual `fly deploy` / Pages publish is done by the user with their accounts, following `docs/deploy.md` (needs their login and card).
