import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Profile,
  AgentSettings,
  ClinicStatus,
  ClinicStatusValue,
  ShortlistEntry,
  AgentRun,
  WizardState,
  WizardStepId,
} from './types';

// ── Default values ──────────────────────────────────────────

const DEFAULT_AGENT_SETTINGS: Omit<AgentSettings, 'userId'> = {
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

  // Auth
  signUp: (email: string) => void;
  signIn: (email: string) => boolean;
  signOut: () => void;

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
          // User already exists in store — session is active
          return true;
        }
        return false;
      },

      signOut: () => {
        // Clear only the session user. Profile, settings, statuses, shortlist remain.
        set({ user: null });
      },

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
      },

      removeFromShortlist: (clinicId: string) => {
        const next = { ...get().shortlist };
        delete next[clinicId];
        set({ shortlist: next });
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
      },

      // ── Agent run ──

      setAgentRun: (run: AgentRun) => set({ agentRun: run }),

      updateAgentRun: (partial: Partial<AgentRun>) => {
        const existing = get().agentRun;
        if (!existing) return;
        set({ agentRun: { ...existing, ...partial } });
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
    }
  )
);
