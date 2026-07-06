export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type Profile = {
  userId: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  ohipNumber: string;
  ohipSkipped: boolean;
  dateOfBirth: string;
  language: 'en' | 'fr' | 'zh' | 'yue' | 'pa' | 'tl' | 'other';
  familySize: 1 | 2 | 3 | 4 | 5 | 6;
  criteria: Array<'walk_in_ok' | 'telehealth_ok' | 'female_doctor' | 'complex_care' | 'mental_health' | 'paediatric'>;
  languageOther: string | null;
  additionalNotes: string | null;
  isComplete: boolean;
};

export type AgentSettings = {
  userId: string;
  voicemailScript: string;
  searchRadiusKm: number;
  callHoursStart: string;
  callHoursEnd: string;
  autoShortlistOnAccept: boolean;
  customDiscoveryScript: string | null;
};

export type Clinic = {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  postalCode: string;
  phone: string;
  website: string;
  languages: Array<'en' | 'fr' | 'zh' | 'yue' | 'pa' | 'tl' | 'pl' | 'pt'>;
  acceptingNewPatients: boolean | 'unknown';
  lastVerifiedAt: string | null;
  walkInOk: boolean;
  telehealthOk: boolean;
  // Real-mode clinics restored from Postgres have no distance (the scout
  // response is the only distance source); null hides the distance line.
  distanceKm: number | null;
};

export type ClinicStatusValue =
  | 'not_called'
  | 'calling'
  | 'accepted'
  | 'rejected'
  | 'voicemail_left'
  | 'no_answer';

export type ClinicStatus = {
  userId: string;
  clinicId: string;
  status: ClinicStatusValue;
  lastContactedAt: string | null;
  notes: string;
  capturedCriteria: {
    postalCodesAccepted: string[];
    ageRangeMin: number | null;
    ageRangeMax: number | null;
    familySizeLimit: number | null;
    inPersonOk: boolean;
    telehealthOk: boolean;
  } | null;
  callTranscript: string | null;
  statusTimeline: Array<{ status: string; timestamp: string }>;
};

export type ShortlistEntry = {
  userId: string;
  clinicId: string;
  addedAt: string;
  bookingDate: string | null;
  bookingNotes: string;
};

export type AgentRunState = 'idle' | 'queued' | 'running' | 'complete';

export type AgentRunResult = 'accepted' | 'rejected' | 'voicemail_left' | 'no_answer';

export type AgentRun = {
  id: string;
  userId: string;
  state: AgentRunState;
  startedAt: string | null;
  completedAt: string | null;
  totalClinics: number;
  callsAttempted: number;
  callsCompleted: number;
  currentClinicId: string | null;
  results: Record<string, AgentRunResult> | null;
};

export type WizardStepId =
  | 'welcome'
  | 'who'
  | 'where'
  | 'health-card'
  | 'household'
  | 'criteria';

export type WizardState = {
  currentStepId: WizardStepId;
  completedStepIds: WizardStepId[];
  data: {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string;
    postalCode: string;
    detectedNeighborhood: string | null;
    ohipNumber: string;
    ohipSkipped: boolean;
    familySize: number;
    language: string;
    languageOther: string | null;
    criteria: string[];
    additionalNotes: string | null;
  };
};
