// Boot-time backend mode switch (Shohei's design decision, overrides the battle
// plan's hard cutover): the app is either fully 'demo' (mock auth, localStorage
// persist, Phase 4 fake run engine) or fully 'real' (Supabase auth, Postgres
// persistence, live run pipeline). The mode is decided ONCE at module load and
// never changes at runtime, so no code path can mix the two identities (the
// battle plan's P4 orphaned-data risk).
export type BackendMode = 'demo' | 'real';

/**
 * A value counts as configured only when it is non-empty AND not one of the
 * .env.example placeholders ("eyJ...", "https://YOUR-PROJECT.supabase.co").
 * Without this guard, copying .env.example to .env would boot a broken 'real'
 * mode; with it, the app stays honestly in demo mode until real keys exist.
 */
function configured(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v === '') return false;
  if (v.includes('...') || v.includes('YOUR-PROJECT')) return false;
  return true;
}

function decideMode(): BackendMode {
  if (import.meta.env.VITE_FORCE_DEMO === 'true') return 'demo';
  return configured(import.meta.env.VITE_SUPABASE_URL) &&
    configured(import.meta.env.VITE_SUPABASE_ANON_KEY)
    ? 'real'
    : 'demo';
}

export const BACKEND_MODE: BackendMode = decideMode();

export const isRealMode = BACKEND_MODE === 'real';

/** Copy for the sidebar badge so a demo audience can see which build this is. */
export const BACKEND_MODE_LABEL = isRealMode ? 'Live backend' : 'Demo mode';
