// Server-side Supabase clients. This file must never be imported from src/.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/** Service-role client: bypasses RLS. /api code only. */
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase server env vars missing');
    adminClient = createClient(url, key, { auth: { persistSession: false } });
  }
  return adminClient;
}

/**
 * Resolve the calling user from a Bearer JWT. Returns null when the token is
 * missing or invalid; handlers translate that into a 401.
 */
export async function userFromRequest(authHeader: string | undefined): Promise<{ id: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}
