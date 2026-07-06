// Real-mode orchestration (moves P4, P5, C6): Supabase session lifecycle,
// Postgres hydration into the Zustand store, and the Realtime run sync that
// feeds the existing Phase 4 run-card / pill / transcript UI from DB rows
// instead of the setTimeout engine. Demo mode never calls anything in here
// (initRealBackend is a no-op), so the two identities cannot mix.
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { isRealMode } from './backendMode';
import { getSupabase } from './supabaseClient';
import { useAppStore, DEFAULT_AGENT_SETTINGS } from '../store/useAppStore';
import type {
  User,
  AgentRun,
  AgentRunResult,
  ClinicStatus,
  ClinicStatusValue,
} from '../store/types';
import { fetchProfile } from './repositories/profile';
import { fetchAgentSettings } from './repositories/agentSettings';
import { fetchShortlist } from './repositories/shortlist';
import { fetchClinicsByIds } from './repositories/clinics';
import {
  fetchRecentRuns,
  fetchCallsForRun,
  subscribeRunEvents,
  transcriptToString,
  type RunRow,
  type CallRow,
} from './repositories/runs';

let booted = false;
let hydratedUserId: string | null = null;
let unsubscribeRealtime: (() => void) | null = null;
let refetchTimer: ReturnType<typeof setTimeout> | null = null;

export function mapSupabaseUser(u: SupabaseUser): User {
  return {
    id: u.id,
    email: u.email ?? '',
    createdAt: u.created_at ?? new Date().toISOString(),
  };
}

/**
 * Called once from main.tsx. Restores the session (getSession), keeps it in
 * sync (onAuthStateChange), and only then flips authLoaded  --  routing never
 * redirects before that (P4 countermove for the three-state redirect bug).
 */
export function initRealBackend(): void {
  if (!isRealMode || booted) return;
  booted = true;
  const supabase = getSupabase();

  void supabase.auth
    .getSession()
    .then(async ({ data }) => {
      const session = data.session;
      if (session?.user) {
        useAppStore.getState().setUser(mapSupabaseUser(session.user));
        await hydrateUser(session.user.id).catch((e) => {
          console.error('initial hydration failed', e);
        });
      }
    })
    .catch((e) => {
      console.error('session restore failed', e);
    })
    .finally(() => {
      useAppStore.getState().setAuthLoaded(true);
    });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      stopRunSync();
      hydratedUserId = null;
      useAppStore.getState().clearAllUserState();
      return;
    }
    if (session?.user) {
      useAppStore.getState().setUser(mapSupabaseUser(session.user));
      if (hydratedUserId !== session.user.id) {
        // Defer: supabase-js warns against awaiting client calls inside this callback.
        const userId = session.user.id;
        setTimeout(() => {
          void hydrateUser(userId).catch((e) => console.error('hydration failed', e));
        }, 0);
      }
    }
  });
}

/**
 * Real sign-out: Supabase ends the session; the SIGNED_OUT event above clears
 * the whole user's client state (not just the user slice).
 */
export async function realSignOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error(`sign out failed: ${error.message}`);
}

/**
 * Load everything this user owns from Postgres into the store. This is the
 * P5 verification path: clear localStorage, refresh, sign in, and profile,
 * settings, and shortlist all come back from here.
 */
async function hydrateUser(userId: string): Promise<void> {
  hydratedUserId = userId;

  const [profile, settings, shortlist] = await Promise.all([
    fetchProfile(userId),
    fetchAgentSettings(userId),
    fetchShortlist(userId),
  ]);

  useAppStore.setState({
    profile,
    agentSettings: settings ?? { userId, ...DEFAULT_AGENT_SETTINGS },
    shortlist,
  });

  // Clinics the shortlist references must exist in the catalog to render.
  const shortlistClinicIds = Object.keys(shortlist);
  if (shortlistClinicIds.length > 0) {
    const clinics = await fetchClinicsByIds(shortlistClinicIds);
    useAppStore.getState().mergeClinics(clinics);
  }

  await refreshRunNow();
  startRunSync(userId);
}

// ── Realtime run sync (move C6) ──────────────────────────────────────────────

function startRunSync(userId: string): void {
  stopRunSync();
  unsubscribeRealtime = subscribeRunEvents(userId, () => {
    // Debounced refetch-on-event: robust against bursts and merge bugs.
    if (refetchTimer) clearTimeout(refetchTimer);
    refetchTimer = setTimeout(() => {
      void refreshRunNow().catch((e) => console.error('run refetch failed', e));
    }, 300);
  });
}

function stopRunSync(): void {
  if (refetchTimer) {
    clearTimeout(refetchTimer);
    refetchTimer = null;
  }
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }
}

/**
 * Refetch recent runs + calls and re-derive UI state. Also called right after
 * POST /api/run/start. Refresh-mid-run recovery lives here: the newest run
 * with calls restores the running card from DB state.
 */
export async function refreshRunNow(): Promise<void> {
  if (!hydratedUserId) return;
  const runs = await fetchRecentRuns(hydratedUserId, 5);

  // The newest run owns the error surface: a failed newest run shows its
  // reason (for example not_configured:<ENV_NAME>); anything newer clears it.
  const newest = runs[0] ?? null;
  const runError =
    newest?.state === 'failed'
      ? typeof newest.counts?.error === 'string'
        ? (newest.counts.error as string)
        : 'run_failed'
      : null;

  // The run card shows the newest run that actually called clinics; failed
  // runs and scout-only runs (no calls) are skipped, not rendered as results.
  let applied = false;
  for (const run of runs) {
    if (run.state === 'failed' || run.state === 'scouting') continue;
    const calls = await fetchCallsForRun(run.id);
    if (calls.length === 0) continue; // scout-only run
    await applyRunWithCalls(run, calls);
    applied = true;
    break;
  }
  if (!applied) {
    useAppStore.setState({ agentRun: null });
  }
  useAppStore.setState({ runError });
}

const TERMINAL_STATUSES = new Set<CallRow['status']>([
  'accepted',
  'rejected',
  'voicemail_left',
  'no_answer',
  'failed',
]);

/** DB 'failed' (initiation/extraction failure) renders as no_answer: the call produced no answer for the user. */
function toStatusValue(status: CallRow['status']): ClinicStatusValue {
  if (status === 'queued') return 'not_called';
  if (status === 'failed') return 'no_answer';
  return status;
}

function toRunResult(status: CallRow['status']): AgentRunResult {
  if (status === 'failed' || status === 'no_answer') return 'no_answer';
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'rejected';
  return 'voicemail_left';
}

/** Map DB rows onto the exact Phase 4 shapes (AgentRun + clinicStatuses) the UI already renders. */
async function applyRunWithCalls(run: RunRow, calls: CallRow[]): Promise<void> {
  const store = useAppStore.getState();

  // Ensure every called clinic exists in the catalog.
  const knownIds = new Set(store.clinics.map((c) => c.id));
  const missingIds = [...new Set(calls.map((c) => c.clinic_id))].filter((id) => !knownIds.has(id));
  if (missingIds.length > 0) {
    const clinics = await fetchClinicsByIds(missingIds);
    useAppStore.getState().mergeClinics(clinics);
  }

  // ── AgentRun (the run card's three states: idle/running/complete) ──────────
  const completedCalls = calls.filter((c) => TERMINAL_STATUSES.has(c.status));
  const callingCall = calls.find((c) => c.status === 'calling') ?? null;
  const results: Record<string, AgentRunResult> = {};
  for (const call of completedCalls) {
    results[call.clinic_id] = toRunResult(call.status);
  }

  const state: AgentRun['state'] =
    run.state === 'complete' ? 'complete' : callingCall ? 'running' : 'queued';

  const agentRun: AgentRun = {
    id: run.id,
    userId: run.user_id,
    state,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    totalClinics: calls.length,
    callsAttempted: calls.filter((c) => c.status !== 'queued').length,
    callsCompleted: completedCalls.length,
    currentClinicId: callingCall?.clinic_id ?? null,
    results,
  };

  // ── Clinic statuses (pills, timeline, transcript) derived from calls ───────
  const prevStatuses = useAppStore.getState().clinicStatuses;
  const statuses: Record<string, ClinicStatus> = { ...prevStatuses };
  for (const call of calls) {
    const status = toStatusValue(call.status);
    const timeline: ClinicStatus['statusTimeline'] = [];
    if (call.started_at) timeline.push({ status: 'calling', timestamp: call.started_at });
    if (call.ended_at && TERMINAL_STATUSES.has(call.status)) {
      timeline.push({ status, timestamp: call.ended_at });
    }
    statuses[call.clinic_id] = {
      userId: run.user_id,
      clinicId: call.clinic_id,
      status,
      lastContactedAt: call.ended_at ?? call.started_at ?? null,
      // Notes are client-side only in real mode (no schema home); preserve them.
      notes: prevStatuses[call.clinic_id]?.notes ?? '',
      capturedCriteria: null,
      callTranscript: transcriptToString(call.transcript),
      statusTimeline: timeline,
    };
  }

  useAppStore.setState({ agentRun, clinicStatuses: statuses });

  // Auto-shortlist accepted clinics (C7 hero flow) when the setting is on.
  const { agentSettings, shortlist, addToShortlist } = useAppStore.getState();
  if (agentSettings?.autoShortlistOnAccept) {
    for (const call of completedCalls) {
      if (call.status === 'accepted' && !shortlist[call.clinic_id]) {
        addToShortlist(call.clinic_id); // writes through to Postgres (upsert, duplicate-safe)
      }
    }
  }
}
