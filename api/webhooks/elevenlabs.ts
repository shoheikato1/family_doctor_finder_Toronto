// POST /api/webhooks/elevenlabs (move C5): post-call ingest. Verifies the
// ElevenLabs HMAC signature before touching the database (engineering.md rule 5),
// stores transcript/extraction/costs on the matched call, then advances the chain.
//
// Signature scheme per the ElevenLabs post-call webhook docs: header
// `elevenlabs-signature: t=<unix>,v0=<hex hmac-sha256 of "<unix>.<raw body>">`.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '../_lib/supabase';
import { respondIfMissingEnv } from '../_lib/env';
import { logEvent } from '../_lib/log';
import { logCost } from '../_lib/costs';
import { advanceChain, callIndexFromId } from '../_lib/chain';
import { personaForIndex } from '../_lib/personas';
import {
  ELEVENLABS_PER_AGENT_MINUTE_USD,
  TWILIO_OUTBOUND_PER_MINUTE_USD,
  TWILIO_INBOUND_PER_MINUTE_USD,
} from '../_lib/config';

// The HMAC is computed over the raw request bytes, so body parsing is disabled
// and the stream is read manually.
export const config = { api: { bodyParser: false } };

const SIGNATURE_TOLERANCE_SECONDS = 30 * 60;

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length > 0) return Buffer.concat(chunks).toString('utf8');
  // Fallback if a body helper consumed the stream anyway: only byte-faithful
  // forms are acceptable for HMAC (a re-stringified object would not verify).
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return '';
}

function verifySignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  const parts = new Map(
    header.split(',').map(kv => {
      const idx = kv.indexOf('=');
      return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()] as [string, string];
    }),
  );
  const t = parts.get('t');
  const v0 = parts.get('v0');
  if (!t || !v0) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10));
  if (Number.isNaN(age) || age > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v0.replace(/^v0=/, ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

interface PostCallPayload {
  type?: string;
  data?: {
    conversation_id?: string;
    status?: string;
    transcript?: unknown;
    metadata?: { call_duration_secs?: number; [k: string]: unknown };
    analysis?: {
      data_collection_results?: Record<string, { value?: unknown } | undefined>;
      call_successful?: string;
      transcript_summary?: string;
    };
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, unknown>;
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (respondIfMissingEnv(res, 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ELEVENLABS_WEBHOOK_SECRET')) return;

  const rawBody = await readRawBody(req);
  const signatureHeader = (req.headers['elevenlabs-signature'] ?? req.headers['x-elevenlabs-signature']) as
    | string
    | undefined;
  if (!verifySignature(rawBody, signatureHeader, process.env.ELEVENLABS_WEBHOOK_SECRET as string)) {
    logEvent({ evt: 'webhook_signature_rejected' });
    res.status(401).json({ error: 'invalid_signature' });
    return;
  }

  let payload: PostCallPayload;
  try {
    payload = JSON.parse(rawBody) as PostCallPayload;
  } catch {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  // Only transcription events carry the result; acknowledge everything else
  // (e.g. post_call_audio) so ElevenLabs does not retry.
  if (payload.type !== 'post_call_transcription' || !payload.data) {
    res.status(200).json({ ok: true, ignored: payload.type ?? 'unknown' });
    return;
  }
  const data = payload.data;

  // ── Match our call: conversation_id first, then the call_id we sent out ────
  const sb = supabaseAdmin();
  const callIdFromClientData = data.conversation_initiation_client_data?.dynamic_variables?.call_id;
  let call: { id: string; run_id: string; mode: string; status: string } | null = null;
  if (data.conversation_id) {
    const { data: byConv } = await sb
      .from('calls')
      .select('id, run_id, mode, status')
      .eq('conversation_id', data.conversation_id)
      .maybeSingle();
    call = byConv ?? null;
  }
  if (!call && typeof callIdFromClientData === 'string') {
    const { data: byId } = await sb
      .from('calls')
      .select('id, run_id, mode, status')
      .eq('id', callIdFromClientData)
      .maybeSingle();
    call = byId ?? null;
  }
  if (!call) {
    // The Receptionist agent's own post-call webhook lands here too in dry-run;
    // it matches no Caller-side call row and is deliberately ignored.
    logEvent({ evt: 'webhook_unmatched', conversationId: data.conversation_id ?? null });
    res.status(200).json({ ok: true, matched: false });
    return;
  }

  // ── Map extraction to status ────────────────────────────────────────────────
  const dcr = data.analysis?.data_collection_results ?? {};
  const acceptingRaw = dcr['accepting_new_patients']?.value;
  const accepting = String(acceptingRaw ?? 'unknown').trim().toLowerCase();
  const callIndex = callIndexFromId(call.id);
  const persona = call.mode === 'dry_run' ? personaForIndex(callIndex) : null;

  let status: 'accepted' | 'rejected' | 'voicemail_left' | 'failed';
  if (persona === 'voicemail') {
    status = 'voicemail_left'; // voicemail persona: nobody answered the question
  } else if (accepting === 'yes') {
    status = 'accepted';
  } else if (accepting === 'no') {
    status = 'rejected';
  } else {
    // Call completed but extraction was inconclusive: an extraction failure,
    // not a no_answer (that status is reserved for watchdog timeouts). Fork F6
    // (Anthropic post-processing) picks these up if they exceed 1 in 10.
    status = 'failed';
  }

  const durationSecs = Number(data.metadata?.call_duration_secs ?? 0);
  const recordingUrl =
    typeof data.metadata?.recording_url === 'string' && data.metadata.recording_url
      ? (data.metadata.recording_url as string)
      : data.conversation_id
        ? `https://api.elevenlabs.io/v1/convai/conversations/${data.conversation_id}/audio`
        : null;

  const { error: updateError } = await sb
    .from('calls')
    .update({
      status,
      conversation_id: data.conversation_id ?? undefined,
      transcript: data.transcript ?? null,
      extracted: {
        accepting_new_patients: accepting,
        data_collection_results: dcr,
        call_successful: data.analysis?.call_successful ?? null,
        transcript_summary: data.analysis?.transcript_summary ?? null,
        duration_secs: durationSecs,
        persona,
      },
      recording_url: recordingUrl,
      ended_at: new Date().toISOString(),
    })
    .eq('id', call.id);
  if (updateError) {
    logEvent({ evt: 'webhook_ingest_failed', callId: call.id, error: updateError.message });
    res.status(500).json({ error: 'db_error' });
    return;
  }
  logEvent({
    evt: 'call_ended',
    runId: call.run_id,
    callId: call.id,
    status,
    persona,
    durationSecs,
    conversationId: data.conversation_id ?? null,
  });

  // ── Cost events (unit prices from config.ts, cited in the battle plan) ─────
  if (durationSecs > 0) {
    const minutes = durationSecs / 60;
    const agents = call.mode === 'dry_run' ? 2 : 1; // dry-run burns Caller + Receptionist
    await logCost(
      'elevenlabs',
      'agent_minutes',
      minutes * agents,
      minutes * agents * ELEVENLABS_PER_AGENT_MINUTE_USD,
      call.id,
    );
    // Twilio bills per started minute; outbound leg always, inbound leg only in
    // dry-run (the sandbox number receives the call).
    const billedMinutes = Math.ceil(minutes);
    await logCost('twilio', 'voice_outbound_minutes', billedMinutes, billedMinutes * TWILIO_OUTBOUND_PER_MINUTE_USD, call.id);
    if (call.mode === 'dry_run') {
      await logCost('twilio', 'voice_inbound_minutes', billedMinutes, billedMinutes * TWILIO_INBOUND_PER_MINUTE_USD, call.id);
    }
  }

  // ── Next call in the chain ──────────────────────────────────────────────────
  await advanceChain(call.run_id);
  res.status(200).json({ ok: true, call_id: call.id, status });
}
