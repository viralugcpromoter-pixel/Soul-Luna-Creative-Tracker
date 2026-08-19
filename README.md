# Cosmetic Cocoon — Creative Tracker (standalone version)

This is the deployable version of the tracker — same features as the Claude
artifact (log creatives, editing/launch pipeline, Meta ad pull, analytics),
but backed by Supabase + Vercel so it works with its own URL, no Claude
session needed.

## 1. Create the database (Supabase)

1. Go to supabase.com → New Project (free tier is fine).
2. Once it's ready: **Project Settings → API** — copy the **Project URL**,
   the **anon key**, and the **service_role key**. You'll need the URL and
   the service_role key in step 3.
3. **SQL Editor → New query** — paste the contents of `schema.sql` from this
   folder and run it. This creates the `creatives` and `pages` tables.

## 2. Push this folder to GitHub

Create a new repo (e.g. `cocoon-creative-tracker`) and push everything in
this folder to it — either via GitHub's web upload, your local `git`, or
Claude Code if you have it set up.

## 3. Deploy on Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo you just
   made.
2. Before deploying, add these **Environment Variables**:
   - `SUPABASE_URL` — the Project URL from step 1
   - `SUPABASE_SERVICE_ROLE_KEY` — the service_role key from step 1
     (server-side only — never exposed to the browser)
   - `META_ACCESS_TOKEN` — a Meta Graph API access token with ads_read
     access to the Cosmetic Cocoon ad accounts. If you already generated
     one for Ad-Klaro, the same token works here (must be the `EAAU...`
     format, not a Stripe-style key).
3. Deploy. You'll get a live URL — that's the one to share with the team.

## Notes

- **Meta pull is a raw Graph API read**, not an AI-assisted match like the
  Claude version had. If an ad has no `meta_ad_id` on file (manual/working
  title entries), it does a simple name-contains match against your ad
  list — good enough most of the time, but double-check before trusting a
  pulled number on an ambiguous name.
- **"Results" isn't a single fixed metric** — Meta's `actions` field varies
  by campaign objective (messages, leads, purchases, etc.), so instead of
  guessing which one is "the" result, the app shows spend/impressions/
  clicks/CTR plus the raw actions list. Read that list yourself rather than
  assuming a specific number is the one that matters for a given ad.
- Add more pages/ad accounts any time from inside the app (Log Creative →
  "+ Add a new page / ad account") — no redeploy needed, they're stored in
  the `pages` table.
- Theme choice is saved per-browser (localStorage), same as before.
