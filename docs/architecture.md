# Architecture: the 13 layers, honestly

This document maps Find a Family Doctor against the full production stack, layer by layer, with the actual mechanism, the trade-off taken, and the upgrade path. The point is not that every layer has heavy machinery; the point is that every layer has a *decision*.

## System shape

```
Browser (React SPA, design-system components)
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
Supabase ── Postgres (RLS per user) + Auth + Realtime (UI live updates)
```

The Caller pipeline is **webhook-driven, not loop-driven**: no process waits 20 minutes for 10 calls. Each post-call webhook advances the chain; a cron watchdog recovers lost webhooks. This is the shape serverless wants, and it is why the run survives a mid-run page refresh (state lives in Postgres, not in a process or the browser).

## Layer by layer

| # | Layer | Mechanism here | The decision and its trade-off |
|---|---|---|---|
| 1 | Frontend | Vite + React + TS + Tailwind + Zustand; 19-component design system with a tokens-only rule | Zustand stays UI-state only after the backend swap; server state lives in Postgres and arrives via Realtime. Trade-off: no local-first offline mode. |
| 2 | APIs & backend logic | Vercel serverless functions in `/api` | Chose event-driven chain over a long-lived worker; the platform's 10s-60s function limit forces good architecture. Trade-off: orchestration logic spreads across webhook + cron, mitigated by one shared `chain.ts`. |
| 3 | Database & storage | Supabase Postgres; migrations in git (`supabase/migrations/`) | Schema is the contract, written before code. Recordings referenced by URL with a 30-day retention job; transcripts kept. |
| 4 | Auth & permissions | Supabase Auth (email+password) + JWT verified server-side on every endpoint | Replaced the prototype's "auth theatre" in one commit, no coexistence window (two identity systems in parallel is how data orphans). |
| 5 | Hosting & deployment | Vercel: SPA + functions on one deployment; `vercel.json` SPA rewrites | One deployable unit, one URL, no CORS story between app and API. |
| 6 | Cloud & compute | Serverless only; zero servers owned | Cold starts accepted (calls take minutes; +200ms is noise). Trade-off named, not ignored. |
| 7 | CI/CD & version control | Git with move-scoped commits; GitHub; Vercel builds every push, preview URL per branch | The battle plan's moves map to commits, so `git log` reads as the build story. |
| 8 | Security & RLS | RLS on every user table (`user_id = auth.uid()`); `clinics` shared read-only; service-role key server-only; HMAC-verified webhooks; secrets grep gate per phase (`grep -rn "sk_\|AIza\|TWILIO\|ELEVENLABS" src/` must be empty); live/dry decision made only server-side | The client is untrusted by construction: a devtools user can flip client flags and only change copy, never behaviour. |
| 9 | Rate limiting | Server-enforced: 2 runs/user/day; global $30/month cost kill switch summed from `cost_events` | Enforcement lives in `/api/run/start`; the UI only mirrors it. A curl past the cap gets refused, which is the test. |
| 10 | Caching & CDN | Vercel edge CDN for static assets; `clinics` table is a data cache of Places results (`place_id` unique, `last_verified_at`) | Saves repeat Places spend and keeps clinic identity stable across runs. Trade-off: staleness, bounded by re-verification on scout. |
| 11 | Load balancing & scaling | Serverless auto-scales horizontally; Supabase manages Postgres; ElevenLabs concurrency capped by plan | v1 calls sequentially (concurrency 1) on purpose: politeness, debuggability, and plan limits before parallelism. |
| 12 | Error tracking & logs | Structured JSON log lines at every state transition; Vercel function logs; `cost_events` doubles as an audit trail | $0 tier is logs-plus-discipline, not paging. Upgrade path: Sentry free tier, one afternoon. |
| 13 | Availability & recovery | Managed uptime (Vercel/Supabase); watchdog cron recovers stuck calls/runs; schema rebuildable from git migrations | Free tier has no point-in-time restore. Named upgrade: Supabase Pro ($25/mo) for daily backups when data becomes precious. |

## The three decisions that matter most

1. **Dry-run is real, not mocked.** The demo pipeline places a real outbound call through real telephony to a real voice agent playing a receptionist. Going live is one destination-number substitution behind a server-side flag plus a compliance checklist. Mocks would have demonstrated nothing.
2. **The database is the source of truth for runs.** UI state machines died in the prototype (Phase 4 mock could strand a fake "running" state on refresh). Real state in Postgres + Realtime subscriptions dissolved that class of bug instead of patching it.
3. **Compliance is architecture, not copy.** The CRTC disclosure is the agent's *fixed first message* (not model-generated), calling hours are enforced server-side, recordings have a retention job, and the live flag cannot flip until a checklist with named owners is green. The regulatory surface was designed for, not discovered later.

## Cost model (hobby scale, cited in the battle plan)

ElevenLabs $6-22 + Twilio ~$3.65 + Google Places $0 (within free SKU allowances, ≤10 Place Details per run) + Supabase $0 + Vercel $0 ≈ **$10-26/month**, with a server-enforced kill switch at $30.
