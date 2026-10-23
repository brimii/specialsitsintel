# DEPLOY — Full cloud cutover runbook

Target state: SpecialSitsIntel runs 100% in the cloud. No `npm run dev`
on Windows, no `.env.local` on your machine, no secrets off-platform.
All development via claude.ai/code + Vercel preview URLs. All production
traffic via Vercel + Supabase + Stripe live mode.

This runbook has **three human-side phases**. Work through them in
order. Phases 2 and 3 have hard dependencies on Phase 1 being complete.

---

## Phase 1 — Vercel project + env vars (30-45 min)

### 1.1 Create / connect the Vercel project

If the project doesn't yet exist in your Vercel account:

1. Go to https://vercel.com/new
2. Import the `brimii/specialsitsintel` repository from GitHub
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave as `./`
5. Build command: default (`next build`)
6. Install command: default (`npm install`)
7. Do NOT deploy yet — click "Environment variables" and skip to 1.2
8. **Change the production branch**: Settings → Git → Production Branch
   set to `claude/create-claude-md-memory-o4d1u` for now (or merge
   that branch to `main` first and keep `main` as production — safer
   long-term; see 4.3).

### 1.2 Add all env vars to Vercel

In Vercel: **Settings → Environment Variables**. For each var below,
set it with scope **Production + Preview + Development**. The values
you need to copy from your current `.env.local` on Windows.

**Required (10 vars)** — the app will not boot without these:

| Variable | Value source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API | Same for all 3 scopes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same place, "anon public" key | Same for all 3 scopes |
| `SUPABASE_SERVICE_ROLE_KEY` | Same place, "service_role" key | Keep this SECRET — bypasses RLS |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys | **TEST key** (`sk_test_...`) for Preview + Development, **LIVE key** (`sk_live_...`) for Production. See Phase 2 for live-mode setup. |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks → signing secret | TEST webhook for Preview + Dev, LIVE webhook for Production — different values |
| `STRIPE_PRICE_ANALYST` | Stripe dashboard → Products → Analyst → copy price ID | TEST and LIVE have DIFFERENT price IDs |
| `STRIPE_PRICE_INSTITUTIONAL` | Same, Institutional product | Same TEST/LIVE split |
| `STRIPE_PRICE_ENTERPRISE` | Same, Enterprise product | Same TEST/LIVE split |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → API Keys | Same for all 3 scopes (or dev-only in dev scope if you want to isolate billing) |
| `CRON_SECRET` | Generate a long random string, e.g. `openssl rand -hex 32` | Same for all 3 scopes |

**Optional (5 vars)** — graceful degradation if missing:

| Variable | Purpose |
|---|---|
| `FINNHUB_API_KEY` | US real-time market prices fallback |
| `TWELVEDATA_API_KEY` | Non-US market prices fallback |
| `ALPHAVANTAGE_API_KEY` | US historical, last resort |
| `EDINET_API_KEY` | Japan filings (3rd-pass PR finder) |
| `SEC_EDGAR_UA` | Custom User-Agent for SEC calls (SEC requires contact info — set to `"YourName your@email.com"`) |

### 1.3 First deploy

1. Click **Deploy** in Vercel
2. Wait for the build to finish (~2-4 min first time)
3. Open the Preview URL Vercel gives you (looks like
   `https://specialsitsintel-xxxxx.vercel.app`)
4. **Smoke test**:
   - `/` loads with deals and the LIVE INTEL banner
   - `/admin/review` returns 404 if you're not signed in as admin
   - `/security` loads
   - Click **📊 Refresh market prices** in `/admin/review` — logs
     should show `[refreshMarketPrices] DONE :: updated=...`

### 1.4 Verify env vars via /api/health

Visit:
```
https://specialsitsintel-xxxxx.vercel.app/api/health?key=<CRON_SECRET>
```

Expected response:
```json
{
  "ok": true,
  "env": "production",
  "stripeMode": "TEST",
  "missingRequired": [],
  ...
}
```

If anything is in `missingRequired`, add it in Vercel settings and
redeploy (Vercel → Deployments → ⋯ → Redeploy).

---

## Phase 2 — Stripe LIVE mode cutover (45-60 min)

Only do this when Phase 1 is green. Live mode handles real money —
mistakes cost actual euros.

### 2.1 Create live products

1. Stripe dashboard → **toggle to Live mode** (top-right switch)
2. **Products** → **+ Add product**. Create 3 products matching the
   tier pricing in CLAUDE.md section 4:
   - **Analyst** — €150/mo recurring, €1,800/yr recurring (two prices)
   - **Institutional** — €600/mo recurring
   - **Enterprise** — €2,500/mo recurring (or "contact sales")
3. For each: copy the **price_...** ID (not the product ID)

### 2.2 Create live webhook

1. Stripe dashboard → **Developers → Webhooks → + Add endpoint**
2. Endpoint URL:
   `https://<your-production-domain>/api/stripe/webhook`
   (Use your Vercel production URL, or your custom domain once set up)
3. Events to listen for (minimum):
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. After creation, copy the **Signing secret** (`whsec_...`)

### 2.3 Swap Vercel env vars to live

In Vercel → Settings → Environment Variables, update **only the
Production scope** (keep Preview + Development on test keys):

- `STRIPE_SECRET_KEY` → the `sk_live_...` key
- `STRIPE_WEBHOOK_SECRET` → the `whsec_...` from 2.2
- `STRIPE_PRICE_ANALYST` → live price ID
- `STRIPE_PRICE_INSTITUTIONAL` → live price ID
- `STRIPE_PRICE_ENTERPRISE` → live price ID

Then: **Redeploy Production** so the new env vars take effect.

### 2.4 Live mode smoke test

Easiest no-risk test:

1. Create a new user account on your production URL
2. Click **Subscribe to Analyst**
3. Pay with **4000 0000 0000 0077** (Stripe live-mode allowed test
   card that succeeds, no real charge)
4. Confirm redirect to success
5. In Supabase → `profiles` → your user → `tier` should be `analyst`
6. In Stripe → **Payments** → see the test payment appear
7. In Stripe → **Customers** → your email → cancel the subscription
   to clean up

If anything fails, verify `/api/health` first — it reports Stripe mode.
Then check Stripe → Developers → Webhooks → your endpoint → **Logs**
to see what the webhook received and the response status.

---

## Phase 3 — Centralise secrets, kill local dev (15 min)

### 3.1 Delete .env.local from Windows

Once Phase 1 and 2 are green:

1. On your Windows machine, open `C:\Users\loren\Documents\specialsitsintel`
2. **Back up** `.env.local` once in a password manager (1Password /
   Bitwarden / etc.) — call the entry "SpecialSitsIntel .env.local
   backup YYYY-MM-DD"
3. Delete the file from your Windows machine
4. Delete `node_modules\` folder too (frees a few hundred MB)

### 3.2 Install the Vercel GitHub integration (if not already)

Vercel → Settings → Git → should show "Connected to brimii/specialsitsintel".
Every push to any branch now creates a Preview Deployment with its own
URL you can test against.

### 3.3 Your new workflow

- **Code changes**: open https://claude.ai/code, pick the repo, I
  spawn a cloud session, we work there. Each PR/push gets a preview URL.
- **Review**: open the preview URL Vercel gives you in the PR comments.
  No `localhost:3000` ever again.
- **Prod**: push to the production branch (currently
  `claude/create-claude-md-memory-o4d1u` — see 4.3 to switch to `main`).
- **Env var changes**: Vercel dashboard → Settings → Environment
  Variables. Redeploy after any change.
- **Database admin**: Supabase dashboard SQL Editor directly.
- **Stripe admin**: Stripe dashboard directly.

That's it. No PowerShell, no `npm install`, no Node on your laptop.

---

## Phase 4 — Hardening before public launch (variable)

These are the items the audit flagged as PARTIAL. Not blockers for a
soft launch / private beta but needed before public GA.

### 4.1 GDPR self-service (recommended before EU public launch)

Ship an `/account` page with export (JSON download of the user's own
profile + subscription data) and delete (soft-delete + 30-day reversal).
Required under GDPR right-to-portability + right-to-erasure. Estimated
1-2 days of work. Manual handling via contact form is OK for a private
beta.

### 4.2 Pipeline health alerting

Add a daily cron that checks: did any source produce zero candidates
for 72h consecutive? If yes, send a Slack webhook / email alert.
Prevents silent breakage of a source.

### 4.3 Move production branch to `main`

Right now the production branch is a feature branch. For long-term
hygiene:

```
git checkout main
git merge claude/create-claude-md-memory-o4d1u
git push origin main
```

Then in Vercel → Settings → Git → change **Production Branch** to
`main`. Keep the feature branch for ongoing work via PRs → merged
to `main` → auto-deploys to prod.

### 4.4 Custom domain

In Vercel → Settings → Domains → add your domain (e.g.
`app.specialsitsintel.com`). Vercel generates DNS records to add at
your registrar. HTTPS cert is automatic. Update Stripe webhook URL to
use the custom domain after it's live.

---

## Troubleshooting

### `/api/health` returns `missingRequired: [...]`

Add the missing env vars in Vercel → Settings → Environment Variables
with the correct scope (Production for prod, Preview/Development for
preview/dev). Redeploy.

### Stripe webhook fires but tier doesn't update

- Stripe → Developers → Webhooks → your endpoint → Logs: check the
  response code and body
- Vercel → Deployments → latest → Logs: search for `[stripe]` or
  `webhook`
- Common causes: wrong signing secret (402 or signature mismatch),
  wrong price ID → tier mapping (silent no-op), RLS blocking the
  profiles update (unlikely with service_role but worth checking)

### Vercel Cron doesn't fire

- Hobby plan allows 2 daily crons max — if you added a 3rd, newest is
  silently rejected
- Verify `vercel.json` was deployed (should be visible under
  Deployments → latest → Source → vercel.json)
- Cron paths need `CRON_SECRET` to match — verify Vercel sends the
  Bearer header (automatic for scheduled runs)

### Build fails on first deploy

Most common: TypeScript error. The build runs `next build` which runs
`tsc --noEmit` implicitly. Check Vercel → Deployments → latest →
Logs → "Build" step.

If a build fails, you can still iterate from claude.ai/code and push
again. Vercel auto-rebuilds on every push.
