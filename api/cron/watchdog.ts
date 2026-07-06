// GET /api/cron/watchdog (moves C4, Z1): the chain's safety net and the
// retention job. Vercel cron hits this every 5 minutes (vercel.json) and sends
// `Authorization: Bearer ${CRON_SECRET}` automatically when CRON_SECRET is set.
//
// 1. Calls stuck in 'calling' > STALE_CALL_MINUTES become no_answer (lost
//    webhook or nobody picked up) and their run chains advance.
// 2. Recordings older than RECORDING_RETENTION_DAYS are deleted (audio at
//    ElevenLabs when reachable, plus our stored URL); transcripts are kept.
// 3. Runs stuck in scouting/calling > STALE_RUN_MINUTES are marked failed.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';
import { respondIfMissingEnv } from '../_lib/env';
import { logEvent } from '../_lib/log';
import { advanceChain } from '../_lib/chain';
import { STALE_CALL_MINUTES, STALE_RUN_MINUTES, RECORDING_RETENTION_DAYS } from '../_lib/config';

const RETENTION_BATCH = 25;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (respondIfMissingEnv(res, 'CRON_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')) return;
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const sb = supabaseAdmin();
  const now = Date.now();

  // ── 1. Stale calls -> no_answer, then advance their chains ─────────────────
  const staleCallCutoff = new Date(now - STALE_CALL_MINUTES * 60 * 1000).toISOString();
  const { data: staleCalls } = await sb
    .from('calls')
    .select('id, run_id')
    .eq('status', 'calling')
    .lt('started_at', staleCallCutoff);
  const staleRunIds = new Set<string>();
  for (const call of staleCalls ?? []) {
    await sb
      .from('calls')
      .update({ status: 'no_answer', ended_at: new Date().toISOString() })
      .eq('id', call.id)
      .eq('status', 'calling'); // guard: skip if the webhook won the race
    logEvent({ evt: 'call_timed_out', runId: call.run_id, callId: call.id, staleAfterMinutes: STALE_CALL_MINUTES });
    staleRunIds.add(call.run_id);
  }
  for (const runId of staleRunIds) {
    await advanceChain(runId);
  }

  // ── 2. Recording retention: delete audio, keep transcripts (Z1) ────────────
  const retentionCutoff = new Date(now - RECORDING_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  const { data: expired } = await sb
    .from('calls')
    .select('id, conversation_id, recording_url')
    .not('recording_url', 'is', null)
    .lt('ended_at', retentionCutoff)
    .limit(RETENTION_BATCH);
  let recordingsCleared = 0;
  for (const call of expired ?? []) {
    // Best-effort deletion of the source audio at ElevenLabs. Deleting the
    // conversation removes the audio there; our own transcript row is already
    // ingested and is kept. Without an API key we still clear our pointer and
    // log loudly so the gap is visible, never silent.
    if (call.conversation_id && process.env.ELEVENLABS_API_KEY) {
      try {
        const resp = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(call.conversation_id)}`,
          { method: 'DELETE', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } },
        );
        if (!resp.ok && resp.status !== 404) {
          logEvent({ evt: 'recording_delete_failed', callId: call.id, status: resp.status });
          continue; // retry next tick rather than losing track of live audio
        }
      } catch (e) {
        logEvent({ evt: 'recording_delete_failed', callId: call.id, error: e instanceof Error ? e.message : String(e) });
        continue;
      }
    } else if (call.conversation_id) {
      logEvent({ evt: 'recording_delete_skipped_no_key', callId: call.id });
    }
    await sb.from('calls').update({ recording_url: null }).eq('id', call.id);
    logEvent({ evt: 'recording_expired', callId: call.id, retentionDays: RECORDING_RETENTION_DAYS });
    recordingsCleared += 1;
  }

  // ── 3. Stale runs -> failed ─────────────────────────────────────────────────
  const staleRunCutoff = new Date(now - STALE_RUN_MINUTES * 60 * 1000).toISOString();
  const { data: staleRuns } = await sb
    .from('runs')
    .select('id, state')
    .in('state', ['scouting', 'calling'])
    .lt('started_at', staleRunCutoff);
  for (const run of staleRuns ?? []) {
    await sb
      .from('runs')
      .update({ state: 'failed', completed_at: new Date().toISOString(), counts: { error: 'watchdog_timeout' } })
      .eq('id', run.id)
      .in('state', ['scouting', 'calling']);
    logEvent({ evt: 'run_failed', runId: run.id, reason: 'watchdog_timeout', staleAfterMinutes: STALE_RUN_MINUTES });
  }

  res.status(200).json({
    ok: true,
    stale_calls: (staleCalls ?? []).length,
    chains_advanced: staleRunIds.size,
    recordings_cleared: recordingsCleared,
    runs_failed: (staleRuns ?? []).length,
  });
}
