// ── Shohei-tunable operational limits (battle plan moves Z1/Z2) ───────────────
// These are deliberate product decisions, not code constants. Change them here,
// redeploy, done. Battle-plan proposals confirmed as defaults: 2 runs/day, $30/mo.

/** Per-user run cap per Toronto calendar day (Z2, ledger proposal 2/day). */
export const MAX_RUNS_PER_USER_PER_DAY = 2;

/** Global monthly kill switch: when the sum of cost_events.est_cost_usd for the
 *  current month reaches this, /api/run/start refuses new runs (Z2, proposal $30). */
export const MONTHLY_COST_KILL_SWITCH_USD = 30;

/** Audio retention: watchdog deletes recordings older than this; transcripts are
 *  kept until account deletion (Z1, ledger proposal 30 days). */
export const RECORDING_RETENTION_DAYS = 30;

/** A call stuck in 'calling' longer than this is marked no_answer by the watchdog. */
export const STALE_CALL_MINUTES = 10;

/** A run stuck in 'scouting' or 'calling' longer than this is marked failed. */
export const STALE_RUN_MINUTES = 45;

/** Hard cap on clinics per run (product decision, also bounds Place Details spend). */
export const MAX_CLINICS_PER_RUN = 10;

// ── Unit prices for cost_events (all cited in the battle plan recon) ─────────
// Sources: developers.google.com Maps pricing list, elevenlabs.io/pricing/agents,
// twilio.com/en-us/voice/pricing/ca. Fetched 2026-07-06.

/** Places Text Search, Essentials SKU (fork F3 FieldMask): $2.83 per 1,000. */
export const PLACES_TEXT_SEARCH_USD = 2.83 / 1000;

/** Place Details for contact fields (phone/website). Contact fields sit above the
 *  Essentials tier; priced here at the Pro SKU $17 per 1,000 as the conservative
 *  assumption (exact SKU verification is an open ledger row at move S2). */
export const PLACES_DETAILS_USD = 17 / 1000;

/** ElevenLabs agent conversation: $0.08 per minute per agent. Dry-run burns two
 *  agents (Caller + Receptionist); live burns one. */
export const ELEVENLABS_PER_AGENT_MINUTE_USD = 0.08;

/** Twilio Canada voice: outbound leg per minute. */
export const TWILIO_OUTBOUND_PER_MINUTE_USD = 0.014;

/** Twilio Canada voice: inbound leg per minute (dry-run sandbox number only). */
export const TWILIO_INBOUND_PER_MINUTE_USD = 0.0085;

// ── CRTC calling hours (regulatory, NOT tunable; CRTC 2016-442, cited in plan) ──
// Weekdays 9:00-21:30, weekends 10:00-18:00, America/Toronto. Enforced server-side
// in /api/run/start for live mode only. Values in minutes since midnight.
export const CRTC_WEEKDAY_WINDOW = { start: 9 * 60, end: 21 * 60 + 30 };
export const CRTC_WEEKEND_WINDOW = { start: 10 * 60, end: 18 * 60 };
