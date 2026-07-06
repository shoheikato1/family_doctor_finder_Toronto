# API verification script

Rule (battle plan Z4, engineering.md): **no observation, no pass**. Every check below
names the exact command and the observable that counts. Code reading never passes a row.
A mocked response cannot produce any of these observables.

Set once per session:

```sh
BASE=https://YOUR-DEPLOYMENT.vercel.app        # or http://localhost:3000 with `vercel dev`
JWT=eyJ...                                     # a real Supabase session access_token (sign in via the app, copy from devtools: localStorage sb-*-auth-token)
```

## Ledger gates each verification is blocked on

| Gate | Ledger row / move | Unblocks |
|---|---|---|
| Supabase project + schema applied | P3 | flags, scout (DB half), run/start, webhooks, watchdog |
| Vercel deployment + env vars | P6 | everything on a public URL; webhooks REQUIRE the deployed URL (never localhost) |
| Google Cloud billing + Places key | S1 | scout, run/start inline scout |
| ElevenLabs account, Caller + Receptionist agents, webhook secret | C1/C3 | run/start call initiation, both webhooks |
| Twilio upgrade + 2 Canadian numbers imported to ElevenLabs | C3 | actual audio on run/start, receptionist-init end-to-end |

One env var is needed beyond `.env.example` as committed: `USER_CALLBACK_NUMBER`
(the rented outbound Twilio number in E.164; it is the CRTC callback number spoken
by the agent). Add it to Vercel server env at gate C3.

## /api/health (no gate)

```sh
curl -s $BASE/api/health
```

**Pass:** `{"ok":true,"service":"find-a-family-doctor",...}` with a current timestamp.

## /api/flags (gate: Supabase, Vercel)

```sh
curl -s $BASE/api/flags
```

**Pass:** `{"flags":{"caller_live_mode":false,"user_voice_clone":false}}`. Before the
Supabase env vars exist the pass is instead an honest
`503 {"error":"not_configured","missing":"SUPABASE_URL"}`.

**Also verify the method guard:** `curl -s -X POST $BASE/api/flags` returns 405.

## /api/scout (gates: Supabase, Vercel, Google)

```sh
curl -s -X POST $BASE/api/scout -H "Authorization: Bearer $JWT"
```

**Pass, all four observations:**
1. JSON `clinics` array with 1 to 10 entries whose `name`s you can find on Google
   Maps and whose `phone`s are 416/647/437 numbers (spot-check 3 against Maps).
2. Every `distance_km` is at most the user's `search_radius_km`.
3. No hospital, dentist, or pharmacy in the list.
4. Supabase table editor shows the same rows in `clinics`, a `runs` row in state
   `complete` with `counts.clinics_found`, and one `cost_events` row per Places
   request (3 `text_search_essentials` + up to 10 `place_details_contact`).

**Auth guard:** the same curl without the header returns `401 {"error":"unauthenticated"}`.
**Bad postal code:** set profile postal code to `K1A 0A6`, re-run, expect `422 {"error":"fsa_unknown"}`.

## /api/run/start (gates: Supabase, Vercel, Google, ElevenLabs, Twilio)

```sh
curl -s -X POST $BASE/api/run/start \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{}'                                        # or '{"clinic_ids":["<uuid from scout>"]}'
```

**Pass, in order:**
1. Response `{"run_id":..., "mode":"dry_run", "queued":N, ...}` (mode MUST be
   `dry_run` while the `caller_live_mode` DB flag is false).
2. In Supabase: a `runs` row in state `calling`, N `calls` rows, call at index 0
   (id starting `00000000`) in status `calling` with a `conversation_id`, the rest `queued`.
3. **The real-provider observable:** the same conversation id visible as an active
   conversation in the ElevenLabs dashboard, and a Twilio call log entry to
   `SANDBOX_RECEPTIONIST_NUMBER` (never a clinic number in dry-run).

**Cap checks (Z2, must be server-side):**
* Third run the same Toronto day: `429 {"error":"run_cap_reached"}` via curl, not just UI.
* Seed `cost_events` past $30 (SQL editor:
  `insert into cost_events (service, unit, quantity, est_cost_usd) values ('elevenlabs','seed_test',1,31);`),
  re-curl: `429 {"error":"cost_cap_reached"}`. Delete the seed row after.
* Calling hours: with `caller_live_mode` still false, an 8 a.m. Toronto run MUST
  succeed (hours check is live-only). The live-mode hours refusal
  (`403 outside_calling_hours`) is only testable at the go-live checklist gate.

## /api/webhooks/elevenlabs (gates: Vercel deployed URL, ElevenLabs)

Real-path verification: run a dry-run call to completion, then observe. For the
signature logic alone, a synthetic signed request works before agents exist:

```sh
BODY='{"type":"post_call_transcription","data":{"conversation_id":"conv_test"}}'
T=$(date +%s)
SIG=$(printf '%s.%s' "$T" "$BODY" | openssl dgst -sha256 -hmac "$ELEVENLABS_WEBHOOK_SECRET" -hex | sed 's/^.* //')
curl -s -X POST $BASE/api/webhooks/elevenlabs \
  -H "Content-Type: application/json" \
  -H "elevenlabs-signature: t=$T,v0=$SIG" -d "$BODY"
```

**Pass:**
1. Synthetic request above: `200 {"ok":true,"matched":false}` (valid signature, no such call).
2. Same request with `v0=deadbeef`: `401 {"error":"invalid_signature"}`.
3. **End-to-end (the one that counts):** after a dry-run call ends, the `calls` row
   flips to accepted/rejected/voicemail_left with `transcript` populated and matching
   what was actually said, `cost_events` gains one elevenlabs row and one or two twilio
   rows for that call id, and the NEXT queued call flips to `calling` without any human
   action (chain advance). Vercel function logs show `{"evt":"call_ended",...}` then
   `{"evt":"call_initiated",...}`.

## /api/webhooks/receptionist-init (gates: Vercel deployed URL, ElevenLabs, Twilio)

```sh
curl -s -X POST $BASE/api/webhooks/receptionist-init -H "Content-Type: application/json" -d '{}'
```

**Pass:**
1. Curl: JSON with `type":"conversation_initiation_client_data"` and a
   `conversation_config_override.agent.prompt` containing persona text. With no call
   in flight it serves the index-0 persona (`accepting`) and logs `matched:false`.
2. **End-to-end:** during a 10-call dry-run, transcripts across the run show the
   persona mix (accepting / not accepting / voicemail greeting / brusque), and re-running
   produces the SAME persona at the same call position (deterministic schedule).

## /api/cron/watchdog (gates: Supabase, Vercel + CRON_SECRET set)

```sh
curl -s $BASE/api/cron/watchdog -H "Authorization: Bearer $CRON_SECRET"
```

**Pass:**
1. Without the header: `401 {"error":"unauthorized"}`.
2. With it: `{"ok":true,"stale_calls":0,...}` summary JSON.
3. **Stale-call path:** in SQL editor set a test call to
   `status='calling', started_at=now()-interval '20 minutes'` on a run in state
   `calling`; curl the watchdog; the call becomes `no_answer` and the run's next
   queued call is initiated (or the run completes).
4. **Retention path:** seed a call with `recording_url` set and
   `ended_at = now() - interval '31 days'`; curl; `recording_url` becomes null,
   the row's `transcript` is untouched, and the log shows `recording_expired`.
5. Vercel cron dashboard shows the 5-minute schedule executing (freshness signal:
   death must be loud).

## Cross-cutting gates (every phase)

```sh
grep -rn "sk_\|AIza\|TWILIO\|ELEVENLABS" src/     # MUST return zero hits
npm run typecheck && npm run typecheck:api && npm run build
```

**Pass:** zero grep hits; all three commands exit 0.
