// Repository for runs + calls (moves P5 and C6): reads for state recovery and a
// Supabase Realtime subscription (postgres_changes on runs and calls filtered
// by user_id) so the dashboard card, clinic pills, and transcripts move live.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../supabaseClient';

export interface RunRow {
  id: string;
  user_id: string;
  state: 'idle' | 'scouting' | 'calling' | 'complete' | 'failed';
  mode: 'dry_run' | 'live';
  started_at: string;
  completed_at: string | null;
  counts: Record<string, unknown>;
}

export interface CallRow {
  id: string;
  run_id: string;
  user_id: string;
  clinic_id: string;
  mode: 'dry_run' | 'live';
  conversation_id: string | null;
  status: 'queued' | 'calling' | 'accepted' | 'rejected' | 'voicemail_left' | 'no_answer' | 'failed';
  transcript: unknown;
  extracted: Record<string, unknown> | null;
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * Newest-first slice of the user's runs. More than one is needed because
 * scout-only runs (POST /api/scout) interleave with calling runs and carry no
 * calls; the UI wants the newest run that actually called clinics.
 */
export async function fetchRecentRuns(userId: string, limit = 5): Promise<RunRow[]> {
  const { data, error } = await getSupabase()
    .from('runs')
    .select('id, user_id, state, mode, started_at, completed_at, counts')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`runs fetch failed: ${error.message}`);
  return (data ?? []) as RunRow[];
}

/** Calls ordered by id: the queue position is encoded in the id (api/_lib/chain.ts). */
export async function fetchCallsForRun(runId: string): Promise<CallRow[]> {
  const { data, error } = await getSupabase()
    .from('calls')
    .select('id, run_id, user_id, clinic_id, mode, conversation_id, status, transcript, extracted, recording_url, started_at, ended_at')
    .eq('run_id', runId)
    .order('id', { ascending: true });
  if (error) throw new Error(`calls fetch failed: ${error.message}`);
  return (data ?? []) as CallRow[];
}

/**
 * Subscribe to every change on this user's runs and calls. The caller refetches
 * on change (simple and immune to incremental-merge bugs). Returns unsubscribe.
 */
export function subscribeRunEvents(userId: string, onChange: () => void): () => void {
  const supabase = getSupabase();
  const channel: RealtimeChannel = supabase
    .channel(`run-sync-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'runs', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'calls', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * calls.transcript is a jsonb array of {role, message} turns from ElevenLabs.
 * The existing chat-bubble renderer consumes "Agent:"/"Clinic:"-prefixed lines,
 * so the adaptation happens here, not in the component.
 */
export function transcriptToString(transcript: unknown): string | null {
  if (typeof transcript === 'string') return transcript || null;
  if (!Array.isArray(transcript)) return null;
  const lines: string[] = [];
  for (const turn of transcript) {
    if (!turn || typeof turn !== 'object') continue;
    const { role, message } = turn as { role?: unknown; message?: unknown };
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) continue;
    lines.push(`${role === 'agent' ? 'Agent' : 'Clinic'}: ${text}`);
  }
  return lines.length > 0 ? lines.join('\n') : null;
}
