// Thin client for the Vercel /api endpoints (real mode only). Sends the
// Supabase access token as Bearer and normalizes failures so pages can render
// them honestly: a 503 not_configured becomes the "Backend not fully configured
// yet" banner rather than a fake success.
import { getAccessToken } from './supabaseClient';

export type ApiFailure =
  | { kind: 'not_configured'; missing: string }
  | { kind: 'error'; status: number; code: string; detail: string };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure };

export async function postApi<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = await getAccessToken();
  if (!token) {
    return {
      ok: false,
      failure: { kind: 'error', status: 401, code: 'unauthenticated', detail: 'Your session expired. Sign in again.' },
    };
  }

  let resp: Response;
  try {
    resp = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      failure: {
        kind: 'error',
        status: 0,
        code: 'network_error',
        detail: e instanceof Error ? e.message : 'Could not reach the backend.',
      },
    };
  }

  let json: unknown = null;
  try {
    json = await resp.json();
  } catch {
    // Non-JSON body: fall through to the generic failure below.
  }
  const payload = (json ?? {}) as { error?: string; missing?: string; detail?: string };

  if (resp.ok) {
    return { ok: true, data: json as T };
  }
  if (resp.status === 503 && payload.error === 'not_configured') {
    return { ok: false, failure: { kind: 'not_configured', missing: payload.missing ?? 'unknown' } };
  }
  return {
    ok: false,
    failure: {
      kind: 'error',
      status: resp.status,
      code: payload.error ?? `http_${resp.status}`,
      detail: payload.detail ?? `Request failed with status ${resp.status}.`,
    },
  };
}

/** One-line human copy for a failure; the not_configured wording is the placeholder surface. */
export function failureMessage(f: ApiFailure): string {
  if (f.kind === 'not_configured') {
    return `Backend not fully configured yet: missing ${f.missing}`;
  }
  return f.detail || f.code;
}
