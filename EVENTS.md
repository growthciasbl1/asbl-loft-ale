# ASBL Loft ALE — Analytics Events

**TL;DR** — Every meaningful visitor action (view / read / click / form submit) on the ALE chat website is captured client-side, batched, and stored in MongoDB Atlas in the `events` collection of database `asbl_loft`. Pre-existing? **No** — analytics did not exist before this instrumentation. `leads`, `units`, `conversations`, `media` are data collections, not telemetry.

---

## 1. Pipeline

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Browser          │    │ Vercel edge      │    │ MongoDB Atlas     │
│                  │    │                  │    │                  │
│ track()      ──┬─┼──▶ │ POST /api/events │──▶ │ db.events        │
│ useTrackView() │ │    │ (nodejs runtime) │    │ insertMany       │
│                │ │    │                  │    │                  │
│ queue (≤10 or  │ │    │ validateBatch()  │    │                  │
│ flush @ 2s)    │ │    │ enrich UA + IP   │    │                  │
│                │ │    │                  │    │                  │
│ sendBeacon on  ─┘ │    │                  │    │                  │
│ pagehide       │  │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

**Files:**
- Client tracker — [`lib/analytics/tracker.ts`](lib/analytics/tracker.ts)
- Read-event hook — [`lib/analytics/useTrackView.ts`](lib/analytics/useTrackView.ts)
- API route — [`app/api/events/route.ts`](app/api/events/route.ts)
- DB write — [`lib/db/events.ts`](lib/db/events.ts)
- Schema — [`lib/db/schemas.ts`](lib/db/schemas.ts) (`EventDoc`)

---

## 2. Where it's stored

| Thing | Value |
|---|---|
| **Cluster** | MongoDB Atlas — `mukund.uhiyavd.mongodb.net` |
| **Database** | `asbl_loft` (from env `MONGODB_DB`; defaults to `asbl_loft`) |
| **Collection** | `events` |
| **Auth** | SCRAM password auth via `MONGODB_URI` env var |
| **Writer** | Vercel serverless function (`nodejs` runtime) |

Other collections in the same database:

| Collection | What's in it |
|---|---|
| `events` | **← this doc** — every view/read/click/submit |
| `leads` | Name/phone/channel submitted via any form (ShareRequestTile, LeadGate, VisitTile) |
| `units` | 228 unit records (tower, floor, facing, size, price) |
| `media` | GridFS metadata: title, kind, intentTags, audienceTags, gridFsId |
| `conversations` | (optional) full chat transcripts if we start persisting them |
| `media.files` / `media.chunks` | GridFS bucket for the actual image/video/PDF bytes |

---

## 3. Event document shape

Every row in `events` looks like this:

```ts
interface EventDoc {
  _id:         ObjectId;            // assigned by Mongo
  sessionId:   string;              // UUID, tab-scoped (sessionStorage)
  type:        'view' | 'read' | 'click' | 'submit' | 'focus' | 'error' | 'system';
  name:        string;              // e.g. 'landing_chip_click', 'tile:price', 'lead_submit'
  props?:      Record<string, any>; // event-specific metadata (see catalog)
  path:        string;              // '/' or '/chat?q=…'
  referer?:    string;              // document.referrer
  utmCampaign: string | null;       // from ?utm_campaign=...
  userAgent:   string;              // server-stamped
  ip:          string;              // server-stamped (x-forwarded-for first hop)
  clientAt:    Date;                // browser clock when event happened
  serverAt:    Date;                // when Mongo wrote it (authoritative)
}
```

### Example document

```json
{
  "_id":       { "$oid": "..." },
  "sessionId": "0a3d1c42-9b4f-4b56-b0de-7e0e1e0e1f2a",
  "type":      "click",
  "name":      "landing_chip_click",
  "props":     { "label": "Plans", "query": "Tell me about the floor plans" },
  "path":      "/",
  "referer":   "https://www.google.com/",
  "utmCampaign": "rental_yield_fd",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X)…",
  "ip":        "49.36.184.22",
  "clientAt":  { "$date": "2026-04-21T20:51:03.412Z" },
  "serverAt":  { "$date": "2026-04-21T20:51:05.177Z" }
}
```

### Indexes (auto-created lazily on first insert)

| Index | Purpose |
|---|---|
| `{ sessionId: 1, serverAt: -1 }` | Reconstruct a visitor's session timeline |
| `{ type: 1, name: 1, serverAt: -1 }` | "How many `lead_submit` in last 24 h" |
| `{ utmCampaign: 1, serverAt: -1 }` | Campaign attribution |
| `{ serverAt: -1 }` | Recency scans |

---

## 4. Session ID

- Generated via `crypto.randomUUID()` on first visit to the page in a tab.
- Stored in `sessionStorage` under key `asbl_session_id`.
- **Lifetime**: tab lifetime. Closing the tab resets. Reload does **not** reset.
- **Scope**: per tab. Opening a second tab gets its own session.
- Why sessionStorage over localStorage? So we don't accidentally stitch different visitor intents across days into one "mega session". Each arrival = fresh funnel.

When a visitor submits a lead, we also write `sessionId` onto the lead doc (pending — TODO) so you can join `leads ⇔ events` to reconstruct the exact path they took before converting.

---

## 5. Event types

Each event row has a `type` field. The five we actually emit:

| `type` | Semantic |
|---|---|
| `view` | Element mounted / became known-rendered. Cheap. Fires once per session per instance. |
| `read` | Element has been **at least 50% in the viewport for 1.2 seconds**. Genuinely seen. |
| `click` | User interaction — button, chip, toggle, link. |
| `submit` | Form submitted or chat message sent. |
| `system` | Reserved — not currently emitted. |

Reserved for future use: `focus`, `error`.

### `view` vs `read` — the difference

- `view` fires the instant a bot message's card mounts, even if the user scrolls past it in half a second.
- `read` uses `IntersectionObserver` with `threshold: 0.5` and a `1200ms` dwell timer. It fires **only once** per instance, and only if the element is genuinely on screen for >1.2s.
- This lets you distinguish "rendered" from "actually noticed". Useful for funnel health: "90% of sessions see the price tile but only 45% actually read it".
- `read` events are cheaper in Mongo than click events because most tiles get at most 1–2 read rows per session.

---

## 6. The `read` event — deep dive

Fired by the `useTrackView(name, props)` hook. Currently wired into `BotMessage` in [`ChatView.tsx`](components/chat/ChatView.tsx), so every bot response card gets a `tile_view` on mount + `tile_read` once genuinely looked at.

### How it works

```tsx
const ref = useTrackView(
  `tile:${artifact}`,           // event name — 'tile:price', 'tile:unit_plans', etc.
  { artifact, label, unitId },  // props
);
return <div ref={ref}>…</div>;
```

Under the hood:
1. On mount → emit `view` event with `name = tile:<artifact>`.
2. Set up an `IntersectionObserver` on the ref'd element with `threshold: 0.5` (50% visible).
3. When the observer reports intersecting → start a `setTimeout(1200ms)`.
4. If element leaves viewport before timer fires → clear timer.
5. If element stays ≥1.2s → emit `read` event with the same name + props, disconnect observer. Fires **once**.

### Tunables

Both come with sane defaults but can be overridden per call:

```ts
useTrackView(name, props, { readMs: 1500, threshold: 0.75 });
```

### Events you'll see from this hook

For a chat where the user asked three questions (price, yield, unit plans), a typical session produces:

```
view  tile:price         { artifact: 'price',       label: 'Price breakdown · 1,695 East' }
read  tile:price         { artifact: 'price',       label: 'Price breakdown · 1,695 East' }
view  tile:yield         { artifact: 'yield',       label: 'Rental yield · indicative' }
read  tile:yield         { artifact: 'yield',       label: 'Rental yield · indicative' }
view  tile:unit_plans    { artifact: 'unit_plans',  label: 'Unit floor plans' }
read  tile:unit_plans    { artifact: 'unit_plans',  label: 'Unit floor plans' }
```

If they scrolled past the `yield` tile without pausing, the `read` row simply wouldn't appear.

### Filtering reads in Mongo

```js
// All tile reads, most-read tiles first
db.events.aggregate([
  { $match: { type: 'read', name: { $regex: '^tile:' } } },
  { $group:  { _id: '$name', reads: { $sum: 1 } } },
  { $sort:   { reads: -1 } }
])
```

---

## 7. Full event catalog

### Landing page

| `name` | `type` | When | Props |
|---|---|---|---|
| `landing_view` | view | Landing mounts | `{ campaign }` |
| `landing_search_submit` | submit | User presses Enter or clicks send | `{ query, source: 'search'\|'chip'\|'header_cta', campaign }` |
| `landing_chip_click` | click | User taps one of the 5 landing chips (Plans / Price / Amenities / Location / Rental Offer) | `{ label, query }` |
| `header_book_site_visit` | click | Top-right "Book Site Visit" button (on landing) | `{ from: 'landing' }` |

### Chat page

| `name` | `type` | When | Props |
|---|---|---|---|
| `chat_view` | view | ChatView mounts (route `/chat`) | `{ campaign, initialQuery }` |
| `message_send` | submit | User submits any message in chat | `{ query, campaign }` |
| `bot_response` | view | Bot response received & added to feed | `{ query, artifact, label }` |
| `default_chip_click` | click | User taps a fallback chip (shown under `artifact: 'none'` responses) | `{ label, query }` |
| `header_new_chat` | click | "New Chat" in header | `{ from: 'chat' }` |
| `header_book_site_visit` | click | "Book Site Visit" in header (chat mode) | `{ from: 'chat' }` |

### Tiles (generic — every artifact tile)

| `name` | `type` | When | Props |
|---|---|---|---|
| `tile:<artifact>` | view | Tile mounts. `<artifact>` ∈ `price \| yield \| amenity \| trends \| why_fd \| commute \| unit_plans \| master_plan \| urban_corridors \| unit_detail \| finance \| affordability \| plans \| schools \| visit \| share_request \| none` | `{ artifact, label, unitId }` |
| `tile:<artifact>` | read | Tile visible ≥50% for ≥1.2 s | `{ artifact, label, unitId }` |
| `tile_related_click` | click | User taps a follow-up chip inside a tile (TileShell `relatedAsks`) | `{ tile, label, query }` |
| `tile_ask_more_click` | click | User taps the "ask more" footer link inside a tile (TileShell `askMore`) | `{ tile, label, query }` |

### Forms (lead capture)

| `name` | `type` | When | Props |
|---|---|---|---|
| `channel_select` | click | User toggles WhatsApp ⇄ Call inside any form | `{ channel }` |
| `lead_submit` | submit | Any lead form submitted (before network response) | `{ form, reason/subject, channel }` |
| `lead_success` | view | Lead form moves into "thanks" state (after submit returns) | `{ form, channel }` |
| `visit_booking` | submit | Visit-slot form submitted (specifically) | `{ slot, kind, channel }` |

`form` values: `share_request`, `lead_gate`, `visit_booking`.

### Floor-plan carousel

| `name` | `type` | When | Props |
|---|---|---|---|
| `carousel_image_zoom` | click | User clicks the floor-plan image or the zoom button → opens lightbox | `{ plan, via: 'image'\|'button' }` |
| `carousel_nav` | click | User clicks an arrow or a dot to change slides | `{ direction?, target?, via: 'arrow'\|'dot' }` |

---

## 8. Ready-to-run Mongo queries

Paste into Atlas → Collections → `events` → Aggregate, or use Compass.

### a) Daily event volume
```js
db.events.aggregate([
  { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$serverAt' } },
      events: { $sum: 1 },
      sessions: { $addToSet: '$sessionId' },
  }},
  { $project: { events: 1, sessions: { $size: '$sessions' } } },
  { $sort: { _id: -1 } }
])
```

### b) Funnel — arrive → search → chat → bot → lead
```js
db.events.aggregate([
  { $match: { name: { $in: [
      'landing_view','landing_search_submit','chat_view','bot_response','lead_submit'
  ] } } },
  { $group: { _id: '$name', users: { $addToSet: '$sessionId' } } },
  { $project: { count: { $size: '$users' } } }
])
```

### c) Campaign attribution (leads by UTM)
```js
db.events.aggregate([
  { $match: { name: 'lead_submit' } },
  { $group: { _id: '$utmCampaign', leads: { $sum: 1 } } },
  { $sort: { leads: -1 } }
])
```

### d) Most-read tiles
```js
db.events.aggregate([
  { $match: { type: 'read', name: { $regex: '^tile:' } } },
  { $group: { _id: '$name', reads: { $sum: 1 } } },
  { $sort: { reads: -1 } }
])
```

### e) Single visitor's full timeline
```js
db.events.find({ sessionId: 'THE_UUID' }).sort({ serverAt: 1 })
```

### f) Which chips convert best? (clicks → subsequent lead_submit in same session)
```js
db.events.aggregate([
  { $match: { type: { $in: ['click', 'submit'] } } },
  { $sort: { sessionId: 1, serverAt: 1 } },
  { $group: { _id: '$sessionId', events: { $push: { name: '$name', props: '$props' } } } },
  { $match: { 'events.name': 'lead_submit' } },
  { $unwind: '$events' },
  { $match: { 'events.name': { $in: ['landing_chip_click', 'tile_related_click', 'default_chip_click'] } } },
  { $group: { _id: '$events.props.label', lead_sessions: { $addToSet: '$_id' } } },
  { $project: { sessions_with_lead: { $size: '$lead_sessions' } } },
  { $sort: { sessions_with_lead: -1 } }
])
```

---

## 9. Reliability

- **Batching**: events queue locally — flushed every 2 s or whenever 10 accumulate, whichever first.
- **Page-hide guarantee**: `pagehide`, `beforeunload`, and `visibilitychange → hidden` all trigger `navigator.sendBeacon('/api/events', blob)`. Beacon survives page unload. Falls back to `fetch({ keepalive: true })` if Beacon unavailable.
- **Retry**: failed POSTs push events back onto the front of the buffer for the next flush.
- **Server cap**: each batch capped at 50 events (drops the excess). Prevents accidental floods.
- **Indexes lazy**: first insert to `events` triggers `createIndex` for all 4 indexes, non-blocking on failure.
- **Graceful no-op**: if `MONGODB_URI` isn't set, events are silently dropped with a server log and the endpoint still returns `200`. No crashes.
- **Transient Atlas TLS**: rare `SystemOverloadedError` / TLS handshake failure → server logs, batch lost. Not currently retried server-side (client will re-send newer events on next flush anyway).

---

## 10. Adding a new event

Anywhere client-side:

```ts
import { track } from '@/lib/analytics/tracker';

track('click', 'my_new_event', { foo: 'bar' });
```

Rules:
- `type` must be one of: `view`, `read`, `click`, `submit`, `focus`, `error`, `system`.
- `name` is free-form but stick to `snake_case` and prefix related events (e.g. `tile:*`, `carousel_*`, `lead_*`).
- `props` must be JSON-serialisable, no PII (phone numbers go via `/api/webhook` → `leads` collection, not here).

For a "read" (intersection-based) event on a custom element:

```tsx
import { useTrackView } from '@/lib/analytics/useTrackView';

function MyComponent() {
  const ref = useTrackView('my_section_name', { variant: 'A' });
  return <div ref={ref}>…</div>;
}
```

---

## 11. Privacy / no-PII policy

- Phone numbers, names, emails — **never** sent to `events`. They only go via `/api/webhook` into the `leads` collection, and that's the explicit lead-capture flow.
- IP is recorded for campaign attribution and abuse detection. If legal/GDPR pressure comes, switch to `/24` truncation in `lib/db/events.ts` (`x-forwarded-for` is already normalised to the first hop).
- UTM params + referer are recorded. Standard web-analytics practice.
- No 3rd-party analytics vendors (GA, Mixpanel, etc.) — 100% first-party, everything in your Mongo.

---

## 12. Files to touch if you change the analytics system

| File | Role |
|---|---|
| [`lib/analytics/tracker.ts`](lib/analytics/tracker.ts) | Queue, batching, sendBeacon, session id |
| [`lib/analytics/useTrackView.ts`](lib/analytics/useTrackView.ts) | `view` + `read` hook (IntersectionObserver) |
| [`app/api/events/route.ts`](app/api/events/route.ts) | Ingress endpoint (batched POST, validates, enriches UA + IP) |
| [`lib/db/events.ts`](lib/db/events.ts) | Mongo write + lazy index creation |
| [`lib/db/schemas.ts`](lib/db/schemas.ts) | `EventDoc` TypeScript interface |
| [`scripts/seed.ts`](scripts/seed.ts) | Explicit index creation script (`npm run seed`) |
