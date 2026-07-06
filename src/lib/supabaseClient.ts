// The one Supabase client for the SPA. Only the URL and anon key are used here;
// they are the only credentials allowed in the client bundle (engineering.md
// security rule 1). RLS is the security boundary.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isRealMode } from './backendMode';

let client: SupabaseClient | null = null;

/** Lazily created singleton. Throws if called in demo mode: demo code paths must never touch Supabase. */
export function getSupabase(): SupabaseClient {
  if (!isRealMode) {
    throw new Error('Supabase client requested in demo mode');
  }
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    );
  }
  return client;
}

/** Current session's access token, for Bearer auth against /api. Null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}
