// POST /api/scout (move S2): standalone Scout. Finds up to 10 real family
// doctor offices near the user's postal FSA via Google Places API (New),
// upserts them into the shared clinics cache, and records the search as a
// scout-only run (state scouting -> complete, no calls created).
//
// When scouting happens as part of a calling run, /api/run/start invokes the
// same core (api/_lib/scout-core.ts) and owns run state + queued calls there.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, userFromRequest } from './_lib/supabase';
import { respondIfMissingEnv } from './_lib/env';
import { logEvent } from './_lib/log';
import { scoutClinics, ScoutError } from './_lib/scout-core';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (respondIfMissingEnv(res, 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_PLACES_API_KEY')) return;

  const user = await userFromRequest(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const sb = supabaseAdmin();
  const { data: run, error: runError } = await sb
    .from('runs')
    .insert({ user_id: user.id, state: 'scouting', mode: 'dry_run' })
    .select('id')
    .single();
  if (runError || !run) {
    res.status(500).json({ error: 'db_error', detail: runError?.message });
    return;
  }
  logEvent({ evt: 'run_scouting', runId: run.id, userId: user.id, kind: 'scout_only' });

  try {
    const clinics = await scoutClinics(user.id, run.id);
    await sb
      .from('runs')
      .update({
        state: 'complete',
        completed_at: new Date().toISOString(),
        counts: { clinics_found: clinics.length },
      })
      .eq('id', run.id);
    logEvent({ evt: 'run_complete', runId: run.id, kind: 'scout_only', clinics: clinics.length });
    res.status(200).json({ run_id: run.id, clinics });
  } catch (e) {
    await sb
      .from('runs')
      .update({ state: 'failed', completed_at: new Date().toISOString() })
      .eq('id', run.id);
    if (e instanceof ScoutError) {
      logEvent({ evt: 'run_failed', runId: run.id, reason: e.code });
      res.status(e.httpStatus).json(
        e.code === 'not_configured'
          ? { error: 'not_configured', missing: 'GOOGLE_PLACES_API_KEY' }
          : { error: e.code, detail: e.message },
      );
      return;
    }
    logEvent({ evt: 'run_failed', runId: run.id, reason: 'unexpected' });
    res.status(500).json({ error: 'scout_failed', detail: e instanceof Error ? e.message : String(e) });
  }
}
