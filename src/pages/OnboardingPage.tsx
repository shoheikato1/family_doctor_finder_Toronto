import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, CheckCircle2 } from 'lucide-react';
import { Stepper } from '../components/design-system/Stepper';
import { Input } from '../components/design-system/Input';
import { Select } from '../components/design-system/Select';
import { MultiSelect } from '../components/design-system/MultiSelect';
import { Button } from '../components/design-system/Button';
import { Card } from '../components/design-system/Card';
import { useToast } from '../components/design-system/Toast';
import { useAppStore, DEFAULT_AGENT_SETTINGS } from '../store/useAppStore';
import { isRealMode } from '../lib/backendMode';
import { upsertProfile } from '../lib/repositories/profile';
import { upsertAgentSettings } from '../lib/repositories/agentSettings';
import { lookupNeighborhood } from '../mock/postalLookup';
import type { AgentSettings, Profile, WizardStepId } from '../store/types';

// ── Step definitions ─────────────────────────────────────────

const STEPS: Array<{ id: WizardStepId; label: string }> = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'who', label: 'About you' },
  { id: 'where', label: 'Location' },
  { id: 'health-card', label: 'Health card' },
  { id: 'household', label: 'Household' },
  { id: 'criteria', label: 'Preferences' },
];

const STEP_IDS = STEPS.map((s) => s.id);

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'zh', label: 'Mandarin' },
  { value: 'yue', label: 'Cantonese' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'other', label: 'Other' },
] as const;

const FAMILY_SIZE_OPTIONS = [
  { value: 1, label: 'Just me' },
  { value: 2, label: '2 people' },
  { value: 3, label: '3 people' },
  { value: 4, label: '4 people' },
  { value: 5, label: '5 people' },
  { value: 6, label: '6 or more' },
];

const CRITERIA_OPTIONS = [
  { value: 'walk_in_ok', label: 'Walk-in accepted' },
  { value: 'telehealth_ok', label: 'Telehealth available' },
  { value: 'female_doctor', label: 'Female doctor preferred' },
  { value: 'complex_care', label: 'Complex care needs' },
  { value: 'mental_health', label: 'Mental health support' },
  { value: 'paediatric', label: 'Paediatric care' },
];

// ── Field-level validation helpers ───────────────────────────

function validateEmail(v: string) {
  if (!v) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
}

function validateRequired(v: string, label: string) {
  if (!v.trim()) return `${label} is required.`;
}

function validateDob(v: string) {
  if (!v) return 'Date of birth is required.';
  const d = new Date(v);
  if (isNaN(d.getTime())) return 'Enter a valid date.';
  if (d >= new Date()) return 'Date of birth must be in the past.';
}

// ── Component ────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const wizard = useAppStore((s) => s.wizard);
  const setWizardStep = useAppStore((s) => s.setWizardStep);
  const completeWizardStep = useAppStore((s) => s.completeWizardStep);
  const updateWizardData = useAppStore((s) => s.updateWizardData);
  const resetWizard = useAppStore((s) => s.resetWizard);
  const setProfile = useAppStore((s) => s.setProfile);

  // Prefill wizard from existing profile on first mount
  useEffect(() => {
    if (profile && !wizard.data.firstName) {
      updateWizardData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: user?.email ?? '',
        dateOfBirth: profile.dateOfBirth,
        postalCode: profile.postalCode,
        detectedNeighborhood: null,
        ohipNumber: profile.ohipNumber,
        ohipSkipped: profile.ohipSkipped,
        familySize: profile.familySize,
        language: profile.language,
        languageOther: profile.languageOther,
        criteria: [...profile.criteria],
        additionalNotes: profile.additionalNotes,
      });
    } else if (!wizard.data.email && user?.email) {
      updateWizardData({ email: user.email });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step-local field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Finish animation
  const [finishing, setFinishing] = useState(false);

  const currentStepId = wizard.currentStepId;
  const data = wizard.data;

  function setFieldError(key: string, msg: string | undefined) {
    setErrors((e) => {
      const next = { ...e };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });
  }

  // ── Postal lookup ──

  const [neighborhoodMsg, setNeighborhoodMsg] = useState<{
    found: boolean;
    text: string;
  } | null>(
    data.detectedNeighborhood
      ? { found: true, text: `Looks like you're in ${data.detectedNeighborhood}.` }
      : null
  );

  function handlePostalBlur() {
    const hood = lookupNeighborhood(data.postalCode);
    if (data.postalCode.replace(/\s/g, '').length < 3) {
      setNeighborhoodMsg(null);
      return;
    }
    if (hood) {
      setNeighborhoodMsg({ found: true, text: `Looks like you're in ${hood}.` });
      updateWizardData({ detectedNeighborhood: hood });
    } else {
      setNeighborhoodMsg({ found: false, text: "We don't have data for that area yet, but you can continue." });
      updateWizardData({ detectedNeighborhood: null });
    }
  }

  // ── Step validation ──

  function validateStep(stepId: WizardStepId): boolean {
    const nextErrors: Record<string, string> = {};

    if (stepId === 'who') {
      const fnErr = validateRequired(data.firstName, 'First name');
      if (fnErr) nextErrors.firstName = fnErr;
      const lnErr = validateRequired(data.lastName, 'Last name');
      if (lnErr) nextErrors.lastName = lnErr;
      const emErr = validateEmail(data.email);
      if (emErr) nextErrors.email = emErr;
      const dobErr = validateDob(data.dateOfBirth);
      if (dobErr) nextErrors.dateOfBirth = dobErr;
    }

    if (stepId === 'where') {
      const pcErr = validateRequired(data.postalCode, 'Postal code');
      if (pcErr) nextErrors.postalCode = pcErr;
    }

    if (stepId === 'health-card' && !data.ohipSkipped && data.ohipNumber.length > 0 && data.ohipNumber.length < 10) {
      nextErrors.ohipNumber = 'OHIP must be 10 digits';
    }

    if (stepId === 'household' && data.language === 'other') {
      const lo = (data.languageOther ?? '').trim();
      if (lo.length < 3 || !/^[A-Za-z\s]+$/.test(lo)) {
        nextErrors.languageOther = 'Use letters only';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  // ── Navigation ──

  function handleNext() {
    if (!validateStep(currentStepId)) return;

    completeWizardStep(currentStepId);
    const idx = STEP_IDS.indexOf(currentStepId);
    if (idx < STEP_IDS.length - 1) {
      setWizardStep(STEP_IDS[idx + 1]);
    }
  }

  function handleBack() {
    const idx = STEP_IDS.indexOf(currentStepId);
    if (idx > 0) {
      setWizardStep(STEP_IDS[idx - 1]);
    }
  }

  function handleSkipOhip() {
    updateWizardData({ ohipSkipped: true, ohipNumber: '' });
    completeWizardStep('health-card');
    setWizardStep('household');
  }

  async function handleFinish() {
    if (!validateStep(currentStepId)) return;
    completeWizardStep('criteria');

    const newProfile: Profile = {
      userId: user?.id ?? '',
      firstName: data.firstName,
      lastName: data.lastName,
      postalCode: data.postalCode,
      ohipNumber: data.ohipNumber,
      ohipSkipped: data.ohipSkipped,
      dateOfBirth: data.dateOfBirth,
      language: (data.language as Profile['language']) || 'en',
      languageOther: data.language === 'other' ? (data.languageOther ?? null) : null,
      familySize: (data.familySize as Profile['familySize']) || 1,
      criteria: data.criteria as Profile['criteria'],
      additionalNotes: data.additionalNotes ?? null,
      isComplete: true,
    };

    // Real mode (move P5): profile + agent_settings upsert to Postgres before
    // the finish animation; on failure the user stays here and can retry.
    if (isRealMode) {
      const state = useAppStore.getState();
      const settings: AgentSettings =
        state.agentSettings ?? { userId: user?.id ?? '', ...DEFAULT_AGENT_SETTINGS };
      try {
        await upsertProfile(newProfile);
        await upsertAgentSettings(settings);
      } catch (e) {
        console.error('onboarding save failed', e);
        addToast('Could not save your profile to the backend. Try again.', 'warning');
        return;
      }
      if (!state.agentSettings) state.setAgentSettings(settings);
    }

    setProfile(newProfile);
    setFinishing(true);
    await new Promise((r) => setTimeout(r, 900));
    resetWizard();
    navigate('/dashboard');
  }

  const currentStepIndex = STEP_IDS.indexOf(currentStepId);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_IDS.length - 1;

  // ── Finish overlay ──

  if (finishing) {
    return (
      <div className="min-h-screen bg-background-base flex flex-col items-center justify-center gap-4">
        <CheckCircle2 size={48} strokeWidth={1.5} className="text-status-accepted" />
        <p className="font-sans text-lg font-medium text-text-primary">All set. Let's go.</p>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-background-base flex flex-col items-center px-6 py-8">
      {/* Wordmark */}
      <div className="mb-6 text-center">
        <p className="font-sans text-base font-semibold text-text-primary leading-snug">
          Let's Find
        </p>
        <p className="font-sans text-base font-semibold text-primary leading-snug">
          Family Doctor
        </p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <Heart size={10} strokeWidth={1.5} fill="currentColor" className="text-brand-accent shrink-0" />
          <span className="font-sans text-xs text-text-tertiary">Toronto, Ontario</span>
        </div>
      </div>

      <div className="w-full max-w-xl">
        <Stepper
          steps={STEPS}
          currentStepId={currentStepId}
          completedStepIds={wizard.completedStepIds}
        />

        <Card>
          {currentStepId === 'welcome' && (
            <StepWelcome />
          )}
          {currentStepId === 'who' && (
            <StepWho
              data={data}
              onChange={updateWizardData}
              errors={errors}
              setFieldError={setFieldError}
            />
          )}
          {currentStepId === 'where' && (
            <StepWhere
              data={data}
              onChange={updateWizardData}
              onPostalBlur={handlePostalBlur}
              neighborhoodMsg={neighborhoodMsg}
              errors={errors}
              setFieldError={setFieldError}
            />
          )}
          {currentStepId === 'health-card' && (
            <StepHealthCard
              data={data}
              onChange={updateWizardData}
              errors={errors}
            />
          )}
          {currentStepId === 'household' && (
            <StepHousehold
              data={data}
              onChange={updateWizardData}
              errors={errors}
              setFieldError={setFieldError}
            />
          )}
          {currentStepId === 'criteria' && (
            <StepCriteria
              data={data}
              onChange={updateWizardData}
            />
          )}

          {/* Footer navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-soft">
            <div>
              {!isFirstStep && (
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {currentStepId === 'health-card' && !data.ohipSkipped && (
                <Button variant="ghost" onClick={handleSkipOhip}>
                  Skip for now
                </Button>
              )}
              <Button
                variant="primary"
                onClick={isLastStep ? handleFinish : handleNext}
              >
                {isLastStep ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Step sub-components ───────────────────────────────────────

function StepWelcome() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <MapPin size={24} strokeWidth={1.5} className="text-primary shrink-0" />
        <h2 className="font-sans text-xl font-semibold text-text-primary">
          Let's find you a family doctor
        </h2>
      </div>
      <p className="font-sans text-base text-text-secondary leading-relaxed">
        This takes about 5 minutes. We'll collect a few details about you, then configure a voice agent to call clinics in your area on your behalf.
      </p>
      <p className="font-sans text-base text-text-secondary leading-relaxed">
        You stay in control. The agent only calls clinics you approve, during hours you set, and reports back what it finds.
      </p>
      <ul className="flex flex-col gap-2 mt-2">
        {[
          'Tell us a bit about yourself',
          'Set your postal code and search area',
          'Optionally add your health card for pre-screening',
          'Configure the voice agent',
          "Let it run \u2014 we'll show you the results",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 size={16} strokeWidth={1.5} className="text-primary mt-0.5 shrink-0" />
            <span className="font-sans text-sm text-text-secondary">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type StepWhoProps = {
  data: ReturnType<typeof useAppStore.getState>['wizard']['data'];
  onChange: (partial: Partial<ReturnType<typeof useAppStore.getState>['wizard']['data']>) => void;
  errors: Record<string, string>;
  setFieldError: (key: string, msg: string | undefined) => void;
};

function StepWho({ data, onChange, errors, setFieldError }: StepWhoProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-sans text-xl font-semibold text-text-primary">About you</h2>
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="text"
          label="First name"
          value={data.firstName}
          onChange={(v) => onChange({ firstName: v })}
          onBlur={() => setFieldError('firstName', validateRequired(data.firstName, 'First name'))}
          error={errors.firstName}
          required
        />
        <Input
          type="text"
          label="Last name"
          value={data.lastName}
          onChange={(v) => onChange({ lastName: v })}
          onBlur={() => setFieldError('lastName', validateRequired(data.lastName, 'Last name'))}
          error={errors.lastName}
          required
        />
      </div>
      <Input
        type="email"
        label="Email"
        value={data.email}
        onChange={(v) => onChange({ email: v })}
        onBlur={() => setFieldError('email', validateEmail(data.email))}
        error={errors.email}
        required
      />
      <Input
        type="text"
        label="Date of birth"
        value={data.dateOfBirth}
        onChange={(v) => onChange({ dateOfBirth: v })}
        onBlur={() => setFieldError('dateOfBirth', validateDob(data.dateOfBirth))}
        error={errors.dateOfBirth}
        placeholder="YYYY-MM-DD"
        helper="Used to match age-appropriate clinics."
        required
      />
    </div>
  );
}

type StepWhereProps = {
  data: ReturnType<typeof useAppStore.getState>['wizard']['data'];
  onChange: (partial: Partial<ReturnType<typeof useAppStore.getState>['wizard']['data']>) => void;
  onPostalBlur: () => void;
  neighborhoodMsg: { found: boolean; text: string } | null;
  errors: Record<string, string>;
  setFieldError: (key: string, msg: string | undefined) => void;
};

function StepWhere({ data, onChange, onPostalBlur, neighborhoodMsg, errors, setFieldError }: StepWhereProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-sans text-xl font-semibold text-text-primary">Your location</h2>
      <p className="font-sans text-sm text-text-secondary -mt-2">
        We'll search for clinics within your configured radius from this postal code.
      </p>
      <Input
        type="postalCode"
        label="Postal code"
        value={data.postalCode}
        onChange={(v) => onChange({ postalCode: v })}
        onBlur={() => {
          setFieldError('postalCode', validateRequired(data.postalCode, 'Postal code'));
          onPostalBlur();
        }}
        error={errors.postalCode}
        placeholder="M4K 1A1"
        required
      />
      {neighborhoodMsg && (
        <div
          className={[
            'flex items-start gap-2 px-4 py-3 rounded-md border',
            neighborhoodMsg.found
              ? 'bg-surface border-status-accepted text-status-accepted'
              : 'bg-surface border-border-soft text-text-secondary',
          ].join(' ')}
        >
          <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <p className="font-sans text-sm">{neighborhoodMsg.text}</p>
        </div>
      )}
    </div>
  );
}

type StepHealthCardProps = {
  data: ReturnType<typeof useAppStore.getState>['wizard']['data'];
  onChange: (partial: Partial<ReturnType<typeof useAppStore.getState>['wizard']['data']>) => void;
  errors: Record<string, string>;
};

function StepHealthCard({ data, onChange, errors }: StepHealthCardProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-sans text-xl font-semibold text-text-primary">Health card</h2>
      <p className="font-sans text-sm text-text-secondary -mt-2">
        Your OHIP number helps the agent confirm you're eligible with each clinic. This stays on your device and is never sent to a server.
      </p>
      {data.ohipSkipped ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-md border border-border-soft bg-background-base">
          <p className="font-sans text-sm text-text-secondary">Health card skipped.</p>
          <button
            type="button"
            onClick={() => onChange({ ohipSkipped: false })}
            className="font-sans text-sm text-text-primary underline hover:text-primary transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          >
            Add it
          </button>
        </div>
      ) : (
        <Input
          type="ohip"
          label="OHIP number"
          value={data.ohipNumber}
          onChange={(v) => onChange({ ohipNumber: v })}
          placeholder="1234567890"
          error={errors.ohipNumber}
        />
      )}
    </div>
  );
}

type StepHouseholdProps = {
  data: ReturnType<typeof useAppStore.getState>['wizard']['data'];
  onChange: (partial: Partial<ReturnType<typeof useAppStore.getState>['wizard']['data']>) => void;
  errors: Record<string, string>;
  setFieldError: (key: string, msg: string | undefined) => void;
};

function StepHousehold({ data, onChange, errors, setFieldError }: StepHouseholdProps) {
  function handleLanguageChange(v: string) {
    onChange({ language: v, languageOther: v !== 'other' ? null : data.languageOther });
    if (v !== 'other') setFieldError('languageOther', undefined);
  }

  function validateLanguageOther(v: string) {
    const trimmed = v.trim();
    if (trimmed.length < 3 || !/^[A-Za-z\s]+$/.test(trimmed)) return 'Use letters only';
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-sans text-xl font-semibold text-text-primary">Your household</h2>
      <p className="font-sans text-sm text-text-secondary -mt-2">
        The agent will look for clinics that can accommodate everyone in your household.
      </p>
      <Select
        label="How many people need a doctor?"
        value={data.familySize}
        options={FAMILY_SIZE_OPTIONS}
        onChange={(v) => onChange({ familySize: v })}
      />
      <Select
        label="Preferred language"
        value={data.language}
        options={LANGUAGE_OPTIONS as unknown as Array<{ value: string; label: string }>}
        onChange={handleLanguageChange}
      />
      {data.language === 'other' && (
        <Input
          type="text"
          label="Specify language"
          value={data.languageOther ?? ''}
          onChange={(v) => onChange({ languageOther: v })}
          onBlur={() => setFieldError('languageOther', validateLanguageOther(data.languageOther ?? ''))}
          error={errors.languageOther}
          placeholder="e.g. Vietnamese, Somali"
        />
      )}
    </div>
  );
}

type StepCriteriaProps = {
  data: ReturnType<typeof useAppStore.getState>['wizard']['data'];
  onChange: (partial: Partial<ReturnType<typeof useAppStore.getState>['wizard']['data']>) => void;
};

function StepCriteria({ data, onChange }: StepCriteriaProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-sans text-xl font-semibold text-text-primary">Preferences</h2>
      <p className="font-sans text-sm text-text-secondary -mt-2">
        Select anything that matters to you. You can change these later.
      </p>
      <MultiSelect
        label="Care preferences"
        value={data.criteria}
        options={CRITERIA_OPTIONS}
        onChange={(v) => onChange({ criteria: v })}
      />
      <p className="font-sans text-xs text-text-tertiary">
        None selected is fine  --  the agent will search broadly.
      </p>

      <div className="flex flex-col gap-1.5 pt-2 border-t border-border-soft">
        <label className="font-sans text-sm font-medium text-text-primary">
          Anything else we should know?
        </label>
        <textarea
          value={data.additionalNotes ?? ''}
          onChange={(e) => onChange({ additionalNotes: e.target.value || null })}
          rows={3}
          placeholder="For example: prefers Tuesday afternoons, has chronic condition, needs wheelchair access"
          className={[
            'w-full rounded-md border border-border-soft bg-surface px-4 py-3',
            'font-sans text-base text-text-primary placeholder:text-text-tertiary',
            'transition-colors duration-120 ease-out resize-y',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'focus-visible:ring-offset-0 focus-visible:border-primary',
          ].join(' ')}
        />
        <p className="font-sans text-xs text-text-tertiary">
          We pass this to the agent so it can ask the right questions.
        </p>
      </div>
    </div>
  );
}
