import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Profile,
  AgentSettings,
  Clinic,
  ClinicStatus,
  ClinicStatusValue,
  ShortlistEntry,
  AgentRun,
  AgentRunResult,
  WizardState,
  WizardStepId,
} from './types';
import { isRealMode } from '../lib/backendMode';
import {
  addShortlistEntry,
  removeShortlistEntry,
  updateShortlistBooking,
} from '../lib/repositories/shortlist';
// Demo-mode data source and fake-call engine (never touched in real mode).
import { MOCK_CLINICS } from '../mock/clinics';
import { buildTranscriptContext, generateCallResult } from '../mock/transcripts';

// ── Agent run simulation helpers ────────────────────────────
// Timers live at module level: they are never persisted, so a page refresh
// mid-run leaves no live timer chain (handled by the rehydration guard below).

let runTimers: Array<ReturnType<typeof setTimeout>> = [];

function clearRunTimers() {
  runTimers.forEach(clearTimeout);
  runTimers = [];
}

function scheduleRunStep(fn: () => void, ms: number) {
  runTimers.push(setTimeout(fn, ms));
}

/** Random result distribution: 40% accepted, 30% rejected, 20% voicemail, 10% no answer. */
function rollCallResult(): AgentRunResult {
  const r = Math.random();
  if (r < 0.4) return 'accepted';
  if (r < 0.7) return 'rejected';
  if (r < 0.9) return 'voicemail_left';
  return 'no_answer';
}

const RUN_QUEUE_MS = 500;
const RUN_CALL_SPACING_MS = 700;
const RUN_CALL_DURATION_MS = 600;

// ── Default values ──────────────────────────────────────────

export const DEFAULT_AGENT_SETTINGS: Omit<AgentSettings, 'userId'> = {
  voicemailScript:
    'Hi, this is calling on behalf of a patient looking for a family doctor accepting new patients. Please call back at your earliest convenience. Thank you.',
  searchRadiusKm: 5,
  callHoursStart: '09:00',
  callHoursEnd: '17:00',
  autoShortlistOnAccept: true,
  customDiscoveryScript: null,
};

const DEFAULT_WIZARD: WizardState = {
  currentStepId: 'welcome',
  completedStepIds: [],
  data: {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    postalCode: '',
    detectedNeighborhood: null,
    ohipNumber: '',
    ohipSkipped: false,
    familySize: 1,
    language: 'en',
    languageOther: null,
    criteria: [],
    additionalNotes: null,
  },
};

// ── Store shape ─────────────────────────────────────────────

type AppState = {
  // Auth / session
  user: User | null;

  // Real mode: true once the initial Supabase session check has resolved.
  // Routing NEVER redirects while this is false (the three-state
  // undefined/null/present redirect bug, battle-plan P4 countermove).
  // Demo mode: always true (mock auth is synchronous).
  authLoaded: boolean;

  // Real mode: the clinic catalog (scout results + clinics referenced by the
  // user's calls and shortlist). Demo mode uses MOCK_CLINICS instead.
  clinics: Clinic[];

  // Real mode: last run-level failure surfaced by the backend (for example a
  // "not_configured:<ENV_NAME>" code from a failed run row).
  runError: string | null;

  // Profile
  profile: Profile | null;

  // Agent settings
  agentSettings: AgentSettings | null;

  // Clinic statuses keyed by clinicId
  clinicStatuses: Record<string, ClinicStatus>;

  // Shortlist entries keyed by clinicId
  shortlist: Record<string, ShortlistEntry>;

  // Current agent run
  agentRun: AgentRun | null;

  // Onboarding wizard
  wizard: WizardState;

  // ── Actions ──

  // Auth (demo-mode auth theatre; real mode drives setUser/clearAllUserState
  // from src/lib/realBackend.ts instead)
  signUp: (email: string) => void;
  signIn: (email: string) => boolean;
  signOut: () => void;
  setUser: (user: User | null) => void;
  setAuthLoaded: (loaded: boolean) => void;

  // Real-mode client state lifecycle: sign-out clears the WHOLE user's client
  // state, not just the user slice (P4 requirement).
  clearAllUserState: () => void;

  // Real-mode clinic catalog
  setClinics: (clinics: Clinic[]) => void;
  mergeClinics: (clinics: Clinic[]) => void;
  setRunError: (error: string | null) => void;

  // Profile
  setProfile: (profile: Profile) => void;
  updateProfile: (partial: Partial<Profile>) => void;

  // Agent settings
  setAgentSettings: (settings: AgentSettings) => void;
  updateAgentSettings: (partial: Partial<AgentSettings>) => void;

  // Clinic statuses
  setClinicStatus: (clinicId: string, status: ClinicStatusValue) => void;
  updateClinicStatus: (clinicId: string, partial: Partial<ClinicStatus>) => void;
  initClinicStatuses: (clinicIds: string[]) => void;

  // Shortlist
  addToShortlist: (clinicId: string) => void;
  removeFromShortlist: (clinicId: string) => void;
  updateShortlistEntry: (clinicId: string, partial: Partial<ShortlistEntry>) => void;

  // Agent run
  setAgentRun: (run: AgentRun) => void;
  updateAgentRun: (partial: Partial<AgentRun>) => void;
  startAgentRun: () => boolean;
  tickAgentRun: (clinicId: string, callsAttempted: number) => void;
  completeAgentRun: (results: Record<string, AgentRunResult>) => void;
  resetAgentRun: () => void;

  // Wizard
  setWizardStep: (stepId: WizardStepId) => void;
  completeWizardStep: (stepId: WizardStepId) => void;
  updateWizardData: (data: Partial<WizardState['data']>) => void;
  resetWizard: () => void;
};

// ── Store ───────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      authLoaded: !isRealMode,
      clinics: [],
      runError: null,
      profile: null,
      agentSettings: null,
      clinicStatuses: {},
      shortlist: {},
      agentRun: null,
      wizard: DEFAULT_WIZARD,

      // ── Auth ──

      signUp: (email: string) => {
        const id = crypto.randomUUID();
        const user: User = { id, email, createdAt: new Date().toISOString() };
        set({
          user,
          agentSettings: { userId: id, ...DEFAULT_AGENT_SETTINGS },
        });
      },

      signIn: (email: string) => {
        const stored = get().user;
        if (stored && stored.email === email) {
          // User already exists in store  --  session is active
          return true;
        }
        return false;
      },

      signOut: () => {
        // Demo mode (D-6): clear only the session user. Profile, settings,
        // statuses, shortlist remain. Real mode uses clearAllUserState instead.
        set({ user: null });
      },

      setUser: (user: User | null) => set({ user }),

      setAuthLoaded: (loaded: boolean) => set({ authLoaded: loaded }),

      clearAllUserState: () => {
        clearRunTimers();
        set({
          user: null,
          clinics: [],
          runError: null,
          profile: null,
          agentSettings: null,
          clinicStatuses: {},
          shortlist: {},
          agentRun: null,
          wizard: DEFAULT_WIZARD,
        });
      },

      setClinics: (clinics: Clinic[]) => set({ clinics }),

      mergeClinics: (incoming: Clinic[]) => {
        const byId = new Map(get().clinics.map((c) => [c.id, c]));
        for (const clinic of incoming) {
          const prev = byId.get(clinic.id);
          // Keep a known distance when a DB read (which has none) merges in.
          byId.set(
            clinic.id,
            prev ? { ...prev, ...clinic, distanceKm: clinic.distanceKm ?? prev.distanceKm } : clinic,
          );
        }
        set({ clinics: [...byId.values()] });
      },

      setRunError: (error: string | null) => set({ runError: error }),

      // ── Profile ──

      setProfile: (profile: Profile) => set({ profile }),

      updateProfile: (partial: Partial<Profile>) => {
        const existing = get().profile;
        if (!existing) return;
        set({ profile: { ...existing, ...partial } });
      },

      // ── Agent settings ──

      setAgentSettings: (settings: AgentSettings) => set({ agentSettings: settings }),

      updateAgentSettings: (partial: Partial<AgentSettings>) => {
        const existing = get().agentSettings;
        if (!existing) return;
        set({ agentSettings: { ...existing, ...partial } });
      },

      // ── Clinic statuses ──

      initClinicStatuses: (clinicIds: string[]) => {
        const userId = get().user?.id ?? '';
        const existing = get().clinicStatuses;
        const next: Record<string, ClinicStatus> = { ...existing };
        for (const clinicId of clinicIds) {
          if (!next[clinicId]) {
            next[clinicId] = {
              userId,
              clinicId,
              status: 'not_called',
              lastContactedAt: null,
              notes: '',
              capturedCriteria: null,
              callTranscript: null,
              statusTimeline: [],
            };
          }
        }
        set({ clinicStatuses: next });
      },

      setClinicStatus: (clinicId: string, status: ClinicStatusValue) => {
        const userId = get().user?.id ?? '';
        const existing = get().clinicStatuses[clinicId];
        const now = new Date().toISOString();
        const base: ClinicStatus = existing ?? {
          userId,
          clinicId,
          status: 'not_called',
          lastContactedAt: null,
          notes: '',
          capturedCriteria: null,
          callTranscript: null,
          statusTimeline: [],
        };
        set({
          clinicStatuses: {
            ...get().clinicStatuses,
            [clinicId]: {
              ...base,
              status,
              lastContactedAt: now,
              statusTimeline: [
                ...base.statusTimeline,
                { status, timestamp: now },
              ],
            },
          },
        });
      },

      updateClinicStatus: (clinicId: string, partial: Partial<ClinicStatus>) => {
        const existing = get().clinicStatuses[clinicId];
        if (!existing) return;
        set({
          clinicStatuses: {
            ...get().clinicStatuses,
            [clinicId]: { ...existing, ...partial },
          },
        });
      },

      // ── Shortlist ──

      addToShortlist: (clinicId: string) => {
        const userId = get().user?.id ?? '';
        set({
          shortlist: {
            ...get().shortlist,
            [clinicId]: {
              userId,
              clinicId,
              addedAt: new Date().toISOString(),
              bookingDate: null,
              bookingNotes: '',
            },
          },
        });
        // Real mode: write through to Postgres; revert the optimistic add on failure.
        if (isRealMode && userId) {
          void addShortlistEntry(userId, clinicId).catch((e) => {
            console.error('shortlist add failed', e);
            const next = { ...get().shortlist };
            delete next[clinicId];
            set({ shortlist: next });
          });
        }
      },

      removeFromShortlist: (clinicId: string) => {
        const removed = get().shortlist[clinicId];
        const next = { ...get().shortlist };
        delete next[clinicId];
        set({ shortlist: next });
        const userId = get().user?.id ?? '';
        if (isRealMode && userId && removed) {
          void removeShortlistEntry(userId, clinicId).catch((e) => {
            console.error('shortlist remove failed', e);
            set({ shortlist: { ...get().shortlist, [clinicId]: removed } });
          });
        }
      },

      updateShortlistEntry: (clinicId: string, partial: Partial<ShortlistEntry>) => {
        const existing = get().shortlist[clinicId];
        if (!existing) return;
        set({
          shortlist: {
            ...get().shortlist,
            [clinicId]: { ...existing, ...partial },
          },
        });
        const userId = get().user?.id ?? '';
        if (isRealMode && userId) {
          void updateShortlistBooking(userId, clinicId, {
            ...('bookingDate' in partial ? { bookingDate: partial.bookingDate ?? null } : {}),
            ...('bookingNotes' in partial ? { bookingNotes: partial.bookingNotes ?? '' } : {}),
          }).catch((e) => {
            console.error('shortlist update failed', e);
            set({ shortlist: { ...get().shortlist, [clinicId]: existing } });
          });
        }
      },

      // ── Agent run ──

      setAgentRun: (run: AgentRun) => set({ agentRun: run }),

      updateAgentRun: (partial: Partial<AgentRun>) => {
        const existing = get().agentRun;
        if (!existing) return;
        set({ agentRun: { ...existing, ...partial } });
      },

      startAgentRun: () => {
        // Demo-mode engine only. Real mode starts runs via POST /api/run/start
        // and feeds this store from DB rows (src/lib/realBackend.ts); the two
        // pipelines must never mix.
        if (isRealMode) return false;

        const current = get().agentRun;
        // Concurrent runs are blocked; the caller surfaces the toast.
        if (current && (current.state === 'queued' || current.state === 'running')) {
          return false;
        }

        clearRunTimers();

        const clinics = MOCK_CLINICS;
        get().initClinicStatuses(clinics.map((c) => c.id));

        const run: AgentRun = {
          id: crypto.randomUUID(),
          userId: get().user?.id ?? '',
          state: 'queued',
          startedAt: new Date().toISOString(),
          completedAt: null,
          totalClinics: clinics.length,
          callsAttempted: 0,
          callsCompleted: 0,
          currentClinicId: null,
          results: {},
        };
        set({ agentRun: run });

        const ctx = buildTranscriptContext(
          get().profile,
          get().agentSettings?.voicemailScript ?? null
        );
        const results: Record<string, AgentRunResult> = {};

        clinics.forEach((clinic, index) => {
          const callStart = RUN_QUEUE_MS + index * RUN_CALL_SPACING_MS;

          // Call begins: pulse the clinic, advance the run pointer.
          scheduleRunStep(() => {
            get().tickAgentRun(clinic.id, index + 1);
            get().setClinicStatus(clinic.id, 'calling');
          }, callStart);

          // Call resolves: seed transcript + criteria, update tallies.
          scheduleRunStep(() => {
            const result = rollCallResult();
            results[clinic.id] = result;
            const seeded = generateCallResult(clinic, ctx, result);
            get().setClinicStatus(clinic.id, result);
            get().updateClinicStatus(clinic.id, seeded);
            get().updateAgentRun({
              callsCompleted: index + 1,
              results: { ...results },
            });
            if (
              result === 'accepted' &&
              get().agentSettings?.autoShortlistOnAccept &&
              !get().shortlist[clinic.id]
            ) {
              get().addToShortlist(clinic.id);
            }
          }, callStart + RUN_CALL_DURATION_MS);
        });

        scheduleRunStep(() => {
          get().completeAgentRun({ ...results });
        }, RUN_QUEUE_MS + clinics.length * RUN_CALL_SPACING_MS);

        return true;
      },

      tickAgentRun: (clinicId: string, callsAttempted: number) => {
        const existing = get().agentRun;
        if (!existing) return;
        set({
          agentRun: {
            ...existing,
            state: 'running',
            currentClinicId: clinicId,
            callsAttempted,
          },
        });
      },

      completeAgentRun: (results: Record<string, AgentRunResult>) => {
        const existing = get().agentRun;
        if (!existing) return;
        set({
          agentRun: {
            ...existing,
            state: 'complete',
            completedAt: new Date().toISOString(),
            currentClinicId: null,
            results,
          },
        });
      },

      resetAgentRun: () => {
        clearRunTimers();
        set({ agentRun: null, runError: null });
      },

      // ── Wizard ──

      setWizardStep: (stepId: WizardStepId) => {
        set((s) => ({ wizard: { ...s.wizard, currentStepId: stepId } }));
      },

      completeWizardStep: (stepId: WizardStepId) => {
        set((s) => ({
          wizard: {
            ...s.wizard,
            completedStepIds: s.wizard.completedStepIds.includes(stepId)
              ? s.wizard.completedStepIds
              : [...s.wizard.completedStepIds, stepId],
          },
        }));
      },

      updateWizardData: (data: Partial<WizardState['data']>) => {
        set((s) => ({
          wizard: { ...s.wizard, data: { ...s.wizard.data, ...data } },
        }));
      },

      resetWizard: () => set({ wizard: DEFAULT_WIZARD }),
    }),
    {
      name: 'fdf-store',
      // Fork F2 (persist config is isolated here, so slices migrate in place):
      // real mode persists ONLY the wizard (transient by design, still local);
      // every migrated slice (user, profile, agentSettings, clinicStatuses,
      // shortlist, agentRun) is owned by Supabase and must never resurrect
      // from localStorage. Demo mode persists everything, exactly as before.
      partialize: (state): Partial<AppState> =>
        isRealMode ? { wizard: state.wizard } : state,
      merge: (persistedState, currentState) => {
        if (isRealMode) {
          // Only the wizard may rehydrate; stale demo-era blobs are ignored.
          const persisted = persistedState as Partial<AppState> | undefined;
          return {
            ...currentState,
            wizard: persisted?.wizard ?? currentState.wizard,
          };
        }

        const merged: AppState = {
          ...currentState,
          ...(persistedState as Partial<AppState>),
        };

        // Hardening: a persisted mid-run agentRun has no live timer chain
        // after a refresh, so it would strand the app in a fake-live state.
        // Reset it to idle (null) and clear any clinic stuck at 'calling'.
        // Also drops persisted runs from the pre-Phase-4 AgentRun shape.
        const run = merged.agentRun as (AgentRun & { totalClinics?: unknown }) | null;
        if (
          run &&
          (run.state === 'queued' ||
            run.state === 'running' ||
            typeof run.totalClinics !== 'number')
        ) {
          merged.agentRun = null;
          const statuses: Record<string, ClinicStatus> = {};
          for (const [id, cs] of Object.entries(merged.clinicStatuses)) {
            statuses[id] = cs.status === 'calling' ? { ...cs, status: 'not_called' } : cs;
          }
          merged.clinicStatuses = statuses;
        }

        return merged;
      },
    }
  )
);
