// Feature flags: read server-side from the feature_flags table.
// The live/dry decision is made exclusively here-side (engineering.md rule 3).
import { supabaseAdmin } from './supabase';

export async function flagEnabled(key: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from('feature_flags')
    .select('enabled')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(`flag read failed for ${key}: ${error.message}`);
  return data?.enabled === true; // missing flag reads as off, never on
}

/** The subset of flags safe to mirror to clients (copy changes only, never behaviour). */
export async function clientFlagMirror(): Promise<Record<string, boolean>> {
  const { data, error } = await supabaseAdmin()
    .from('feature_flags')
    .select('key, enabled')
    .in('key', ['caller_live_mode', 'user_voice_clone']);
  if (error) throw new Error(`flag mirror failed: ${error.message}`);
  return Object.fromEntries((data ?? []).map(r => [r.key, r.enabled]));
}
