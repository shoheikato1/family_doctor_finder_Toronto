# Engineering canon: guardrails only

This file is constraints, not instructions. Anything not listed here is the executor's judgment, bounded by the battle plan (`~/invoca-work-os/wargames/battle-plans/family-doctor-finder-v2.md`).

## Stack (locked)

* Front-end: the existing Vite + React + TypeScript + Tailwind + Zustand SPA. It is not rewritten, reframed, or re-scaffolded.
* Backend: Supabase (auth, Postgres with RLS, Realtime) + Vercel (`/api` serverless functions).
* Voice: ElevenLabs Agents with native Twilio integration. The agent's bundled LLM does the talking; the Anthropic API key is reserved for transcript post-processing (fork F6) only.
* Data source: Google Places API (New). Text Search with minimal FieldMask, Place Details for contact fields on at most the top 10 candidates per run.

## Dependency rule

No new runtime dependencies beyond `@supabase/supabase-js` and what the Vercel toolchain requires. Any exception updates this file in the same edit.

## Styling contract (inherited from v1)

* Compose from the 19 design-system components only; a new component updates `components.md` in the same edit.
* Every colour, radius, and duration via Tailwind tokens. No raw hex in `src/`.

## The backend contract (the whole backend; additions update this file in the same edit)

Tables, all RLS `user_id = auth.uid()` except `clinics` (shared read-only cache) and `feature_flags` (server-read):
`profiles`, `agent_settings`, `clinics`, `runs`, `calls`, `shortlist`, `feature_flags` (`caller_live_mode=false`, `user_voice_clone=false`), `cost_events`.

Endpoints (Vercel `/api`): `health`, `scout` (POST, auth), `run/start` (POST, auth), `run/advance` (internal, webhook-driven), `webhooks/elevenlabs` (POST, HMAC-verified), `webhooks/receptionist-init` (POST), `cron/watchdog`.

## Security rules (hard)

1. Only the Supabase URL and anon key may be `VITE_*`. Every other secret lives in Vercel server env only. Gate after every phase: `grep -rn "sk_\|AIza\|TWILIO\|ELEVENLABS" src/` returns zero hits.
2. The service-role key appears only in `/api` code, never client-side.
3. The live/dry decision is made exclusively inside `/api/run/start` from the server-side `caller_live_mode` flag. Client flags change copy, never behaviour.
4. Run caps and cost kill switches are enforced in `/api`, mirrored (not enforced) in UI.
5. Webhooks verify HMAC before touching the database.

## Compliance strings (embedded verbatim in the Caller agent config; never model-generated)

* First message: "Hi, this is an automated assistant calling on behalf of {{user_first_name}}, who is looking for a family doctor. This call may be recorded so I can share the outcome with them. I have one quick question: is your clinic currently accepting new patients?"
* Contact info on request or before ending: callback {{user_callback}}, email {{contact_email}}, both valid at least 60 days.
* Early exit: the moment the receptionist clearly confirms either way, thank them in one sentence and end the call. Never pitch, never persuade, never ask a second question.

## Verification rule

No move is done from code reading. Done means observed: a browser exercised the flow, or a dashboard/log showed the real event. Mocked responses cannot satisfy a gate that names a real-world observable.
