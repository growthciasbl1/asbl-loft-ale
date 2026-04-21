# ASBL Loft ALE — Production Deploy Guide

## 1. MongoDB Atlas (one-time)

1. https://cloud.mongodb.com → Sign up / sign in.
2. Create a free M0 cluster (region: closest to your target traffic, e.g. `ap-south-1` for India).
3. **Database Access** → Add New Database User → pick "Password" → set username + strong password → role `Atlas admin` (for seed) → Add User. Save the password somewhere safe.
4. **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`). This is needed so Vercel's serverless lambdas can connect.
5. **Database → Connect → Drivers → Node.js** → copy the SRV string. Replace `<password>` with the password you saved.

Paste that string into `MONGODB_URI` in `.env.local` (dev) and Vercel env vars (prod).

### Seed the DB

```bash
npm run seed
```

This creates the `units`, `media`, `leads`, `conversations` collections with indexes and inserts the 228 3BHK units.

## 2. Gemini API

1. https://aistudio.google.com/app/apikey → **Create API key** → "asbl-loft-ale" → Create.
2. Paste in `GEMINI_API_KEY`.
3. Default model `gemini-2.5-flash`; override via `GEMINI_MODEL` if needed.

Free tier covers the volume we expect in early months. Set billing limits in Google Cloud for safety.

## 3. Zoho CRM webhook

No auth required. Leads POST to `https://asbl-crm-api.vercel.app/api/ingest/website`.

Payload shape (Vercel normalizes inside):

```json
{
  "source": "asbl-loft-ale",
  "name": "...",
  "phone": "+91...",
  "email": "... | null",
  "project": "ASBL Loft",
  "reason": "share_request | visit_booking | lead_gate",
  "query": "...",
  "utm_source": "...",
  "utm_campaign": "...",
  "utm_medium": "...",
  "pinned_units": ["A-45E-1870"],
  "referer": "...",
  "user_agent": "...",
  "lead_db_id": "ObjectId hex",
  "captured_at": "ISO 8601"
}
```

## 4. Admin token (for media upload)

Used to protect `/api/media/upload` (GridFS upload endpoint).

```bash
openssl rand -hex 32
```

Paste into `ADMIN_TOKEN`. Rotate anytime — clients using it will just 401 until you distribute the new value.

## 5. Brand images

Drop into `public/asbl/`:

| File | Use |
|---|---|
| `master-plan.png` | Master-plan tile |
| `unit-plan-1695-east.png` | Unit-plans tile · 1,695 East option |
| `unit-plan-1695-west.png` | Unit-plans tile · 1,695 West option |
| `unit-plan-1870.png` | Unit-plans tile · 1,870 option (optional — falls back to "coming soon") |

Alternative (production-grade): upload via admin media upload endpoint to GridFS, then update `lib/utils/mediaLibrary.ts` or serve via `/api/media/<id>`.

## 6. Deploy to Vercel

### One-time

1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "ASBL Loft ALE — initial commit"
   git branch -M main
   git remote add origin https://github.com/1Mukund/asbl-loft-ale.git
   git push -u origin main
   ```

2. https://vercel.com → **Add New → Project → Import** the GitHub repo.

3. **Environment Variables** (Production + Preview + Development):
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional, default `gemini-2.5-flash`)
   - `MONGODB_URI`
   - `MONGODB_DB` (optional, default `asbl_loft`)
   - `CRM_INGEST_URL`
   - `ADMIN_TOKEN`

4. **Deploy**. Vercel runs `npm run build` automatically. First deploy takes ~2 min.

### Domain

1. Vercel project → **Settings → Domains** → Add `loft.asbl.in` (or your chosen subdomain).
2. Copy the DNS records Vercel shows (CNAME or A).
3. Add them in your domain registrar (GoDaddy / Cloudflare / etc.). Propagation: 5 min – 2 hrs.

## 7. Post-deploy sanity checks

```bash
# Replace with your Vercel URL
BASE=https://asbl-loft-ale.vercel.app

# 1. Landing loads
curl -s -o /dev/null -w "%{http_code}\n" $BASE/

# 2. Demo UTM selector
curl -s -o /dev/null -w "%{http_code}\n" $BASE/demo

# 3. Chat API (regex path)
curl -s -X POST $BASE/api/chat -H 'content-type: application/json' \
  -d '{"query":"show me the master plan"}' | head -c 200

# 4. Chat API (LLM path — requires GEMINI_API_KEY set)
curl -s -X POST $BASE/api/chat -H 'content-type: application/json' \
  -d '{"query":"why FD and not Gachibowli?"}' | head -c 200

# 5. Webhook (fake lead, should succeed and push to CRM)
curl -s -X POST $BASE/api/webhook -H 'content-type: application/json' \
  -d '{"name":"Test","phone":"+919999999999"}'
```

## 8. Logs & monitoring

- Vercel → Project → **Logs** tab for runtime + build logs.
- MongoDB Atlas → cluster → **Metrics** for DB load.
- Google AI Studio → **Usage** for Gemini quota and cost.
- Zoho CRM → Leads → filter by `Lead Source = "asbl-loft-ale"` to see incoming.

## Troubleshooting

**Mongo "bad auth" during seed** → password reset didn't save. Atlas → Database Access → Edit user → Edit Password → Save. Update `MONGODB_URI`.

**LLM never fires** → check Vercel logs. If you see `gemini-X not found for API version v1beta`, update `GEMINI_MODEL` to a supported model (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-flash-latest`).

**Images don't load** → verify `public/asbl/*.png` are committed and part of the Vercel build output. Tiles fall back to "coming soon" state if missing.

**CRM push 404** → `CRM_INGEST_URL` typo. Verify env var in Vercel.
