# Ontology: entities, relationships, allowed actions

## Entities

* **User**: an authenticated account (Supabase auth). Owns everything below except Clinic.
* **Profile**: the user's identity for search and calls: first/last name, postal code, language, family size, criteria, notes. One per user.
* **AgentSettings**: how the user's agent behaves: search radius km, call hours window, auto-shortlist toggle, voicemail script, custom script. One per user.
* **Clinic**: a real-world family doctor office, keyed by Google `place_id`. Shared read-only cache across users; no user data ever lives here.
* **Run**: one user-initiated execution of the pipeline. States: `idle → scouting → calling → complete | failed`. Mode: `dry_run | live`.
* **Call**: one Caller-to-clinic conversation within a run. Status: `queued → calling → accepted | rejected | voicemail_left | no_answer | failed`. Holds transcript, extraction, recording URL.
* **ShortlistEntry**: a user's saved clinic, with optional booking date and notes.
* **CallerAgent**: the ElevenLabs agent that speaks for the user. Configured once, parameterized per call with dynamic variables (user name, language, clinic name, callback, contact email).
* **ReceptionistAgent**: the dry-run counterpart. Answers the sandbox number in a per-call persona (accepting / not accepting / voicemail / no answer) served by the initiation webhook.

## Relationships

* User 1:1 Profile, 1:1 AgentSettings
* User 1:N Run; Run 1:N Call; Call N:1 Clinic
* User N:M Clinic through ShortlistEntry
* CallerAgent acts for exactly one User per call; ReceptionistAgent knows nothing about users, only its persona for this call

## Allowed actions (exhaustive)

* User: sign up, sign in, edit Profile/AgentSettings, start a run (server-enforced caps), view own runs/calls/transcripts, shortlist/unshortlist, book meet-and-greet notes, delete account
* Scout: search Places, upsert Clinics, create queued Calls for a run
* Caller: initiate one call at a time per run, speak the fixed disclosure first, ask the one question, end the call on a clear answer, never dial outside permitted hours (live mode), never dial a real clinic unless `caller_live_mode` is true server-side
* System (watchdog): time out stale calls, advance the chain, enforce retention (delete old recordings, keep transcripts)

## Invariants

* A Call's user_id always equals its Run's user_id (RLS enforced)
* `clinics` is the only shared table; everything else is `user_id = auth.uid()`
* Live/dry decision is made only inside `/api/run/start` from the server-side flag
* No entity stores payment data, health records, or third-party personal data beyond a clinic's public business listing
