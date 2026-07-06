// GET /api/flags: the client mirror of server-side feature flags (move P2).
// Copy changes only, never behaviour: the live/dry decision is made exclusively
// inside /api/run/start from the server-side flag (engineering.md rule 3).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clientFlagMirror } from './_lib/flags';
import { respondIfMissingEnv } from './_lib/env';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (respondIfMissingEnv(res, 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')) return;
  try {
    res.status(200).json({ flags: await clientFlagMirror() });
  } catch (e) {
    res.status(500).json({ error: 'flags_unavailable', detail: e instanceof Error ? e.message : String(e) });
  }
}
