# Last steps: the human checklist

Everything code-side is built. These are the only remaining actions, in order, with what each unlocks. Items marked 💳 cost money; everything else is free.

## Stage 1: live demo app (real auth + database, no voice yet)

| # | Action | How | Unlocks |
|---|---|---|---|
| 1 | Apply the database schema | Supabase → SQL Editor → paste `supabase/migrations/0001_init.sql` → Run ("Success. No rows returned") | Everything backend |
| 2 | Put the two Supabase keys in `.env` | API Keys page → Legacy tab → `anon` → `VITE_SUPABASE_ANON_KEY`; `service_role` → `SUPABASE_SERVICE_ROLE_KEY` | Real sign-up + persistence locally |
| 3 | Vercel login in the Claude session | type `! npx vercel login` | Claude can deploy for you |
| 4 | (Claude) deploy: link repo, set env vars, deploy main + the `v1.0-prototype` tag as a second "demo" deployment | automated once 3 is done | Two URLs: mock demo + live app |
| 5 | Add the deployed URL to Supabase auth | Supabase → Authentication → URL Configuration → add the Vercel URL | Sign-up works on the deployed site |

**Demo state after Stage 1:** side-by-side URLs. v1: the mock prototype. v2: real sign-up, real Postgres, Realtime, and honest "not configured yet" banners where Scout/Caller await keys. Strong AI PM demo even before Stage 2.

## Stage 2: real clinic search (Scout)

| # | Action | How | Unlocks |
|---|---|---|---|
| 6 💳 | Google Cloud project + billing | console.cloud.google.com → new project → enable **Places API (New)** → billing (card required; expected $0 within free allowances) → create API key restricted to Places API (New) → budget alert at $10 | Real Toronto clinics |
| 7 | `GOOGLE_PLACES_API_KEY` into `.env` + Vercel env | paste key | `/api/scout` goes live |

## Stage 3: the voice agent (Caller, dry-run)

| # | Action | How | Unlocks |
|---|---|---|---|
| 8 💳 | ElevenLabs plan ($6 or $22/mo) | follow `docs/elevenlabs-setup.md` §1 | Voice |
| 9 💳 | Twilio upgrade (~$20) + 2 Canadian numbers (~$2.30/mo) | setup doc §1-2 | Telephony |
| 10 | Create the two agents (prompts are copy-paste) | setup doc §3-4 | The Caller + fake receptionist |
| 11 | Wire webhooks to the deployed URL | setup doc §5 | Results flow back |
| 12 | All ElevenLabs/Twilio env vars into Vercel | setup doc §6 | Full dry-run hero moment |
| 13 | Optional: record 1-2 min voice sample + sign `docs/consent/voice-clone-consent.md` | setup doc §3 voice note | Your cloned voice behind the flag |

## Never (without the go-live checklist green)

* `caller_live_mode` stays **false**. Real clinics are never dialled until every row of `docs/go-live-checklist.md` (owner-signed) is green, including the legal read on CRTC ADAD applicability. This is an abort condition, not a preference.

## Placeholders currently in the code (each returns an honest 503/banner until filled)

`VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PLACES_API_KEY`, `ELEVENLABS_*` (5 vars), `TWILIO_*` (2), `SANDBOX_RECEPTIONIST_NUMBER`, `USER_CALLBACK_NUMBER`, `CRON_SECRET` (any random string; set it in Vercel).
