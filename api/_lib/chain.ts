// The sequential call chain (moves C4/C5). No long-lived process holds a run
// open: /api/run/start initiates call 1 via advanceChain, then each post-call
// webhook (and the watchdog on timeouts) calls advanceChain again until the
// queue is empty and the run completes. Concurrency is 1 by construction.
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from './supabase';
import { logEvent } from './log';
import { firstMissingEnv } from './env';

const OUTBOUND_CALL_URL = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';

// ── Ordered call ids ─────────────────────────────────────────────────────────
// calls has no sequence column (schema is canon-locked), so queue order is
// encoded in the id itself: the first 8 hex chars of the uuid are the
// zero-padded decimal call index. `order by id` then walks the queue in
// creation order, and the Receptionist persona rotation can recover the index
// from the id alone. Digits are valid hex, so these remain well-formed uuids.
export function sequentialCallId(index: number): string {
  return String(index).padStart(8, '0') + randomUUID().slice(8);
}

export function callIndexFromId(callId: string): number {
  const n = parseInt(callId.slice(0, 8), 10);
  return Number.isNaN(n) ? 0 : n;
}

interface CallRow {
  id: string;
  run_id: string;
  user_id: string;
  clinic_id: string;
  mode: 'dry_run' | 'live';
  status: string;
}

/**
 * Initiate one outbound call through the ElevenLabs native Twilio integration.
 * The live/dry destination decision was made at run creation (call.mode was set
 * inside /api/run/start from the server-side flag; engineering.md rule 3).
 */
async function initiateCall(call: CallRow): Promise<{ ok: true; conversationId: string | null } | { ok: false; reason: string }> {
  const missing = firstMissingEnv(
    'ELEVENLABS_API_KEY',
    'ELEVENLABS_CALLER_AGENT_ID',
    'ELEVENLABS_CALLER_PHONE_NUMBER_ID',
    'CONTACT_EMAIL',
  );
  if (missing) return { ok: false, reason: `not_configured:${missing}` };
  if (call.mode === 'dry_run' && !process.env.SANDBOX_RECEPTIONIST_NUMBER) {
    return { ok: false, reason: 'not_configured:SANDBOX_RECEPTIONIST_NUMBER' };
  }
  // CRTC contact info requires a callback number valid 60+ days: the rented
  // outbound Twilio number, provided as USER_CALLBACK_NUMBER (E.164).
  if (!process.env.USER_CALLBACK_NUMBER) {
    return { ok: false, reason: 'not_configured:USER_CALLBACK_NUMBER' };
  }

  const sb = supabaseAdmin();
  const [{ data: clinic }, { data: profile }] = await Promise.all([
    sb.from('clinics').select('name, phone').eq('id', call.clinic_id).maybeSingle(),
    sb.from('profiles').select('first_name, language').eq('user_id', call.user_id).maybeSingle(),
  ]);
  if (!clinic) return { ok: false, reason: 'clinic_missing' };
  if (!profile) return { ok: false, reason: 'profile_missing' };

  // THE one-switch destination (C4): live dials the clinic, dry-run dials the
  // sandbox Receptionist number. Nothing else differs.
  const toNumber = call.mode === 'live' ? clinic.phone : (process.env.SANDBOX_RECEPTIONIST_NUMBER as string);
  if (!toNumber) return { ok: false, reason: 'clinic_phone_missing' };

  const resp = await fetch(OUTBOUND_CALL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
    },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_CALLER_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_CALLER_PHONE_NUMBER_ID,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          user_first_name: profile.first_name || 'the caller',
          user_language: profile.language || 'English',
          clinic_name: clinic.name,
          user_callback: process.env.USER_CALLBACK_NUMBER,
          contact_email: process.env.CONTACT_EMAIL,
          call_id: call.id, // lets the post-call webhook match this call
        },
      },
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    logEvent({ evt: 'call_initiate_failed', callId: call.id, status: resp.status, body: body.slice(0, 500) });
    return { ok: false, reason: `elevenlabs_${resp.status}` };
  }
  const json = (await resp.json()) as { conversation_id?: string; callSid?: string };
  return { ok: true, conversationId: json.conversation_id ?? null };
}

/** Tally terminal statuses into the run's counts jsonb. */
async function completeRun(runId: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: calls } = await sb.from('calls').select('status').eq('run_id', runId);
  const counts: Record<string, number> = { total: (calls ?? []).length };
  for (const c of calls ?? []) counts[c.status] = (counts[c.status] ?? 0) + 1;
  await sb
    .from('runs')
    .update({ state: 'complete', completed_at: new Date().toISOString(), counts })
    .eq('id', runId);
  logEvent({ evt: 'run_complete', runId, counts });
}

/**
 * Advance the run's call chain: initiate the next queued call, or complete the
 * run when the queue is empty. Called from /api/run/start (call 1), the
 * post-call webhook (each subsequent call), and the watchdog (after timeouts).
 * Initiation failures mark that call failed and move on, bounded by queue size.
 */
export async function advanceChain(runId: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: run } = await sb.from('runs').select('id, state').eq('id', runId).maybeSingle();
  if (!run || run.state !== 'calling') {
    logEvent({ evt: 'chain_noop', runId, state: run?.state ?? 'missing' });
    return;
  }

  // Bounded loop: at worst every queued call fails to initiate once.
  for (let guard = 0; guard < 25; guard++) {
    const { data: next } = await sb
      .from('calls')
      .select('id, run_id, user_id, clinic_id, mode, status')
      .eq('run_id', runId)
      .eq('status', 'queued')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!next) {
      await completeRun(runId);
      return;
    }

    const result = await initiateCall(next as CallRow);
    if (result.ok) {
      await sb
        .from('calls')
        .update({
          status: 'calling',
          started_at: new Date().toISOString(),
          conversation_id: result.conversationId,
        })
        .eq('id', next.id);
      logEvent({
        evt: 'call_initiated',
        runId,
        callId: next.id,
        callIndex: callIndexFromId(next.id),
        conversationId: result.conversationId,
        mode: next.mode,
      });
      return; // exactly one call in flight per run
    }

    await sb
      .from('calls')
      .update({ status: 'failed', ended_at: new Date().toISOString() })
      .eq('id', next.id);
    logEvent({ evt: 'call_failed_to_initiate', runId, callId: next.id, reason: result.reason });

    // Configuration failures will fail every remaining call identically:
    // fail the run loudly instead of burning the queue one by one.
    if (result.reason.startsWith('not_configured:')) {
      await sb
        .from('runs')
        .update({ state: 'failed', completed_at: new Date().toISOString(), counts: { error: result.reason } })
        .eq('id', runId);
      logEvent({ evt: 'run_failed', runId, reason: result.reason });
      return;
    }
  }
}
