# Find a Family Doctor

A web app that finds a family doctor for people in Toronto who don't have one. A **Scout agent** shortlists real clinics from public sources; a **Caller agent**, a real voice agent, phones each office, discloses that it is an automated assistant calling on behalf of the named user, asks exactly one question (are you accepting new patients?), and politely ends the call. The user comes back to a shortlist of confirmed-accepting clinics with transcripts, and makes only the one call that matters: booking their own meet and greet.

Roughly 2.5 million Ontario residents have no family doctor. The default paths are a years-long provincial waitlist or a grinding manual loop: google clinics, call, nobody picks up, remember to call back, repeat. This product does the grind; the human keeps the human moment.

## How it works

```
Browser (React SPA)
   │  Supabase JS (auth session, Realtime subscriptions)
   │  fetch → /api/* (Bearer JWT)
   ▼
Vercel ── static SPA via edge CDN
   └── /api serverless functions (Node)
        ├── scout.ts ──────────► Google Places API (New)
        ├── run/start.ts ─────► ElevenLabs outbound call ──► Twilio ──► phone network
        ├── webhooks/elevenlabs.ts ◄── post-call results (HMAC-verified)
        ├── webhooks/receptionist-init.ts ◄── dry-run persona requests
        └── cron/watchdog.ts (5 min: stale calls, retention, stuck runs)
   ▼
Supabase ── Postgres (RLS per user) + Auth + Realtime
```

The Caller pipeline is **webhook-driven, not loop-driven**: no process waits 20 minutes for 10 calls. Each post-call webhook advances the chain, and a cron watchdog recovers lost webhooks. Run state lives in Postgres, not the browser, so a mid-run page refresh loses nothing.

**Dry-run is real, not mocked.** The demo pipeline places a real outbound call through real telephony to a real voice agent playing a receptionist. Going live is one destination-number substitution behind a server-side flag plus a compliance checklist. Mocks would have demonstrated nothing.

## Responsible AI, by architecture rather than by copy

Voice agents that phone real businesses carry real obligations, so the guardrails are structural:

* **Disclosure first, always.** The Caller's opening line, identifying itself as an automated assistant calling on behalf of the named user, is a fixed compliance string, never model-generated. No impersonation, ever.
* **One question, then leave.** The agent asks whether the clinic accepts new patients and ends the call. It never pitches or persuades.
* **Live mode is a gate, not a toggle.** `caller_live_mode` is false and only exists server-side. Real clinics are never dialled until every row of the go-live checklist (including the CRTC ADAD legal read) is owner-signed green. A devtools user flipping client flags changes copy, never behaviour.
* **Hard caps, server-enforced.** 10 calls per run, 2 runs per user per day, a global monthly cost kill switch. A curl past the cap gets refused; the UI only mirrors the rule.
* **Data minimalism.** Transcripts and recordings exist only to share the outcome with the user who asked; recordings age out on a 30-day retention job. Not medical advice, not a data seller.
* **Voice cloning is consent-gated.** One stock voice by default; the only clone is the author's own, with written consent on file (`docs/consent/`).

## Stack

Vite + React + TypeScript + Tailwind + Zustand (UI state only) · Supabase (Postgres with RLS, Auth, Realtime) · Vercel (SPA + serverless `/api`) · ElevenLabs + Twilio (voice) · Google Places API (New) for discovery. Runs at hobby scale for roughly $10 to 26 a month, with a server-enforced kill switch at $30.

## Status

Code-complete, pending provider keys. The full API layer, schema migrations, and design system are built; every unconfigured provider returns an honest 503 banner rather than a fake success. Staged bring-up:

1. **Stage 1, live demo:** deploy to Vercel, run the Supabase migration, real multi-user sign-up
2. **Stage 2, Scout live:** Google Places key, real Toronto clinic discovery with caching by `place_id`
3. **Stage 3, Caller dry-run:** ElevenLabs agents + Twilio numbers, full voice pipeline against the sandbox receptionist

Remaining human actions live in `docs/LAST-STEPS.md`; the checkable definition of done per stage is in `SPEC.md`.

## Running locally

```bash
npm install
cp .env.example .env   # fill in Supabase keys at minimum; VITE_FORCE_DEMO=true runs the mock demo build
npm run dev
```

`npm run verify` is the standing gate: typecheck (app + api), lint, a secrets grep (no provider keys may appear in `src/`), and a build. Work is not done while it fails.

## Documentation map

* `docs/canon/product.md`, what this is, who it serves, the hard product rules
* `docs/canon/ontology.md`, data model, invariants, allowed actions
* `docs/canon/engineering.md`, stack contract, security rules, compliance strings
* `docs/architecture.md`, the full 13-layer walkthrough with each decision and its trade-off
* `SPEC.md`, definition of done and the behaviour contract for characterization tests
* `docs/LAST-STEPS.md`, the remaining human actions to bring each stage live
