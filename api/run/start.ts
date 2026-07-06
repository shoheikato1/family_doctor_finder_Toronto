// POST /api/run/start (moves C4, Z2): the only place the live/dry decision is
// made (server-side caller_live_mode flag; engineering.md rule 3) and the only
// place run caps, the monthly cost kill switch, and CRTC calling hours are
// enforced. The UI mirrors these refusals; it never enforces them.
//
// Body (optional): { "clinic_ids": ["uuid", ...] } to call clinics from a prior
// /api/scout response. Without clinic_ids the handler scouts inline first.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, userFromRequest } from '../_lib/supabase';
import { flagEnabled } from '../_lib/flags';
import { respondIfMissingEnv } from '../_lib/env';
import { logEvent } from '../_lib/log';
import { monthToDateSpendUsd } from '../_lib/costs';
import { scoutClinics, ScoutError } from '../_lib/scout-core';
import { advanceChain, sequentialCallId } from '../_lib/chain';
import {
  MAX_RUNS_PER_USER_PER_DAY,
  MONTHLY_COST_KILL_SWITCH_USD,
  MAX_CLINICS_PER_RUN,
  CRTC_WEEKDAY_WINDOW,
  CRTC_WEEKEND_WINDOW,
} from '../_lib/config';

// ── America/Toronto clock helpers (no dependencies: Intl only) ───────────────
interface TorontoNow {
  dateKey: string; // YYYY-MM-DD in Toronto
  isWeekend: boolean;
  minutes: number; // minutes since Toronto midnight
}

function torontoParts(d: Date): TorontoNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const weekday = get('weekday');
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    isWeekend: weekday === 'Sat' || weekday === 'Sun',
    minutes: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10),
  };
}

/** 'HH:MM' or 'HH:MM:SS' (Postgres time) to minutes since midnight. */
function timeToMinutes(t: string | null | undefined, fallback: number): number {
  if (!t) return fallback;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return fallback;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (
    respondIfMissingEnv(
      res,
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ELEVENLABS_API_KEY',
      'ELEVENLABS_CALLER_AGENT_ID',
      'ELEVENLABS_CALLER_PHONE_NUMBER_ID',
      'CONTACT_EMAIL',
      'USER_CALLBACK_NUMBER',
    )
  ) {
    return;
  }

  const user = await userFromRequest(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const sb = supabaseAdmin();
  const now = new Date();
  const today = torontoParts(now);

  // ── Cap 1: per-user runs per Toronto calendar day (Z2) ─────────────────────
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
  const { data: recentRuns, error: runsErr } = await sb
    .from('runs')
    .select('id, started_at')
    .eq('user_id', user.id)
    .gte('started_at', twoDaysAgo);
  if (runsErr) {
    res.status(500).json({ error: 'db_error', detail: runsErr.message });
    return;
  }
  const runsToday = (recentRuns ?? []).filter(
    r => torontoParts(new Date(r.started_at)).dateKey === today.dateKey,
  ).length;
  if (runsToday >= MAX_RUNS_PER_USER_PER_DAY) {
    logEvent({ evt: 'run_refused', userId: user.id, reason: 'run_cap_reached', runsToday });
    res.status(429).json({
      error: 'run_cap_reached',
      detail: `Daily limit of ${MAX_RUNS_PER_USER_PER_DAY} runs reached. Try again tomorrow.`,
    });
    return;
  }

  // ── Cap 2: global monthly cost kill switch (Z2) ────────────────────────────
  let spend: number;
  try {
    spend = await monthToDateSpendUsd();
  } catch (e) {
    res.status(500).json({ error: 'db_error', detail: e instanceof Error ? e.message : String(e) });
    return;
  }
  if (spend >= MONTHLY_COST_KILL_SWITCH_USD) {
    logEvent({ evt: 'run_refused', userId: user.id, reason: 'cost_cap_reached', spend });
    res.status(429).json({
      error: 'cost_cap_reached',
      detail: `Monthly cost cap of $${MONTHLY_COST_KILL_SWITCH_USD} reached; runs are paused until next month.`,
    });
    return;
  }

  // ── The live/dry decision, made here and only here ─────────────────────────
  let live: boolean;
  try {
    live = await flagEnabled('caller_live_mode');
  } catch (e) {
    res.status(500).json({ error: 'flag_read_failed', detail: e instanceof Error ? e.message : String(e) });
    return;
  }
  const mode: 'live' | 'dry_run' = live ? 'live' : 'dry_run';
  if (!live && respondIfMissingEnv(res, 'SANDBOX_RECEPTIONIST_NUMBER')) return;

  const { data: settings } = await sb
    .from('agent_settings')
    .select('search_radius_km, call_hours_start, call_hours_end')
    .eq('user_id', user.id)
    .maybeSingle();

  // ── Calling-hours check, live mode only (C4; CRTC 2016-442) ───────────────
  if (live) {
    const crtc = today.isWeekend ? CRTC_WEEKEND_WINDOW : CRTC_WEEKDAY_WINDOW;
    const userStart = timeToMinutes(settings?.call_hours_start, crtc.start);
    const userEnd = timeToMinutes(settings?.call_hours_end, crtc.end);
    const start = Math.max(crtc.start, userStart);
    const end = Math.min(crtc.end, userEnd);
    if (today.minutes < start || today.minutes >= end || start >= end) {
      logEvent({ evt: 'run_refused', userId: user.id, reason: 'outside_calling_hours', minutes: today.minutes });
      res.status(403).json({
        error: 'outside_calling_hours',
        detail: 'Live calls only run inside your calling window intersected with CRTC hours (9:00-21:30 weekdays, 10:00-18:00 weekends, Toronto time).',
      });
      return;
    }
  }

  // ── Create the run ──────────────────────────────────────────────────────────
  const { data: run, error: runError } = await sb
    .from('runs')
    .insert({ user_id: user.id, state: 'scouting', mode })
    .select('id')
    .single();
  if (runError || !run) {
    res.status(500).json({ error: 'db_error', detail: runError?.message });
    return;
  }
  logEvent({ evt: 'run_scouting', runId: run.id, userId: user.id, mode });

  const failRun = async (counts: Record<string, unknown>) => {
    await sb
      .from('runs')
      .update({ state: 'failed', completed_at: new Date().toISOString(), counts })
      .eq('id', run.id);
    logEvent({ evt: 'run_failed', runId: run.id, ...counts });
  };

  // ── Clinic list: caller-provided scout results, or scout inline ────────────
  const body = (req.body ?? {}) as { clinic_ids?: unknown };
  let clinics: Array<{ id: string; name: string; phone: string }>;
  if (Array.isArray(body.clinic_ids) && body.clinic_ids.length > 0) {
    const ids = body.clinic_ids.filter((x): x is string => typeof x === 'string').slice(0, MAX_CLINICS_PER_RUN);
    const { data, error } = await sb.from('clinics').select('id, name, phone').in('id', ids);
    if (error || !data || data.length === 0) {
      await failRun({ error: 'clinics_not_found' });
      res.status(422).json({ error: 'clinics_not_found', detail: 'No clinics match the provided clinic_ids.' });
      return;
    }
    // Preserve the caller's ordering (their ranked scout list).
    const byId = new Map(data.map(c => [c.id, c]));
    clinics = ids.map(id => byId.get(id)).filter((c): c is { id: string; name: string; phone: string } => !!c);
  } else {
    if (respondIfMissingEnv(res, 'GOOGLE_PLACES_API_KEY')) {
      await failRun({ error: 'not_configured:GOOGLE_PLACES_API_KEY' });
      return;
    }
    try {
      clinics = await scoutClinics(user.id, run.id);
    } catch (e) {
      await failRun({ error: e instanceof ScoutError ? e.code : 'scout_failed' });
      if (e instanceof ScoutError) {
        res.status(e.httpStatus).json({ error: e.code, detail: e.message });
      } else {
        res.status(500).json({ error: 'scout_failed', detail: e instanceof Error ? e.message : String(e) });
      }
      return;
    }
  }

  // Live mode can only dial clinics with a known phone number.
  const callable = clinics.filter(c => (live ? c.phone : true)).slice(0, MAX_CLINICS_PER_RUN);
  if (callable.length === 0) {
    await failRun({ error: 'no_callable_clinics' });
    res.status(422).json({ error: 'no_callable_clinics', detail: 'Scout found no clinics with phone numbers to call.' });
    return;
  }

  // ── Queue the calls (ordered ids encode the queue position; see chain.ts) ──
  const callRows = callable.map((clinic, i) => ({
    id: sequentialCallId(i),
    run_id: run.id,
    user_id: user.id,
    clinic_id: clinic.id,
    mode,
    status: 'queued',
  }));
  const { error: callsError } = await sb.from('calls').insert(callRows);
  if (callsError) {
    await failRun({ error: 'calls_insert_failed' });
    res.status(500).json({ error: 'db_error', detail: callsError.message });
    return;
  }

  await sb.from('runs').update({ state: 'calling' }).eq('id', run.id);
  logEvent({ evt: 'run_calling', runId: run.id, mode, queued: callRows.length });

  // Sequential chain: only call 1 starts here; the post-call webhook and the
  // watchdog advance the rest.
  await advanceChain(run.id);

  res.status(200).json({
    run_id: run.id,
    mode,
    queued: callRows.length,
    calls: callRows.map((c, i) => ({ id: c.id, clinic_id: c.clinic_id, position: i })),
  });
}
