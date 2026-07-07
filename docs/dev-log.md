# Dev Log

## Through 2026-07-07: code-complete pending keys
* Commit line: v1 Bolt prototype import, canon docs + schema migration + secrets hygiene, mock agent-run hero moment, full API layer (code-complete pending provider keys), real backend wiring behind a boot-time mode switch (`VITE_FORCE_DEMO`).
* Every unconfigured provider returns an honest 503 / "not configured yet" banner. `supabase/migrations/0001_init.sql` and a `dist/` build exist. Canonical docs: `docs/canon/` (product, engineering, ontology). Live to-do: `docs/LAST-STEPS.md`.
* Safety: `caller_live_mode` stays false; real clinics are never dialled until every row of `docs/go-live-checklist.md` is owner-signed green, including the CRTC ADAD legal read.

## State at session close (2026-07-07)
* Nothing deployed, no real keys installed. Next steps are exactly `docs/LAST-STEPS.md`:
  * Stage 1 (free, live demo): run the SQL migration in Supabase, set the two Supabase keys + URL in `.env`, `npx vercel login`, deploy main + the v1.0-prototype tag, add the Vercel URL to Supabase auth config.
  * Stage 2 (Scout): Google Cloud project + Places API (New) restricted key into `GOOGLE_PLACES_API_KEY`.
  * Stage 3 (Caller dry-run): ElevenLabs plan, Twilio upgrade + 2 Canadian numbers, create the two agents, wire webhooks, set voice/telephony env vars in Vercel.
* Cross-reference: the job_search_OS mastery plan (2026-07-07) tags the Caller dry-run as the fastest production-form agent showcase, one checklist away from a demo.
