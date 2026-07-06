// POST /api/webhooks/receptionist-init (move C3): the dry-run persona server.
// ElevenLabs calls this conversation-initiation webhook when the sandbox number
// answers; the response overrides the Receptionist agent's prompt and first
// message so each call in a dry-run gets a different, deterministic persona.
//
// No auth beyond POST: the response contains persona text only, never user
// data, and the persona schedule is deterministic anyway. The DB lookup only
// finds which call index is in flight.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';
import { respondIfMissingEnv } from '../_lib/env';
import { logEvent } from '../_lib/log';
import { callIndexFromId } from '../_lib/chain';
import { personaForIndex, PERSONAS } from '../_lib/personas';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (respondIfMissingEnv(res, 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')) return;

  // The active in-flight dry-run call. Concurrency is 1 per run, and v1 runs
  // sequentially per user, so the most recently started 'calling' dry-run call
  // is the one ringing the sandbox number right now.
  const { data: active } = await supabaseAdmin()
    .from('calls')
    .select('id, run_id')
    .eq('status', 'calling')
    .eq('mode', 'dry_run')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const callIndex = active ? callIndexFromId(active.id) : 0;
  const persona = PERSONAS[personaForIndex(callIndex)];
  logEvent({
    evt: 'receptionist_persona_served',
    runId: active?.run_id ?? null,
    callId: active?.id ?? null,
    callIndex,
    persona: persona.key,
    matched: Boolean(active),
  });

  // Response shape per the ElevenLabs conversation-initiation webhook contract.
  res.status(200).json({
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      persona: persona.key,
      call_id: active?.id ?? 'none',
    },
    conversation_config_override: {
      agent: {
        prompt: { prompt: persona.prompt },
        first_message: persona.firstMessage,
        language: 'en',
      },
    },
  });
}
