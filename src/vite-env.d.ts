/// <reference types="vite/client" />

interface ImportMetaEnv {
  // The ONLY client-exposed variables (engineering.md security rule 1).
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FORCE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
