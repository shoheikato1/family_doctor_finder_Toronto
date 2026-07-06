// Env-var guard. Secrets come only from process.env (engineering.md security rule 1).
// A handler that needs a missing var answers 503 {error:"not_configured", missing:"NAME"}
// instead of crashing or mocking (no mocked provider responses anywhere).

/** Returns the first missing env var name, or null when all are present. */
export function firstMissingEnv(...names: string[]): string | null {
  for (const name of names) {
    const v = process.env[name];
    if (!v || v.trim() === '') return name;
  }
  return null;
}

interface JsonResponder {
  status: (code: number) => { json: (body: unknown) => void };
}

/**
 * Convenience: respond 503 and return true when a required var is missing.
 * Usage: if (respondIfMissingEnv(res, 'SUPABASE_URL', ...)) return;
 */
export function respondIfMissingEnv(res: JsonResponder, ...names: string[]): boolean {
  const missing = firstMissingEnv(...names);
  if (missing) {
    res.status(503).json({ error: 'not_configured', missing });
    return true;
  }
  return false;
}
