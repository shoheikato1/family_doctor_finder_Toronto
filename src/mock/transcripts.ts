import type { AgentRunResult, Clinic, ClinicStatus, Profile } from '../store/types';
import { LANGUAGE_LABELS } from './clinics';

// ── Context extracted from the user's profile for seeding transcripts ──

export type TranscriptContext = {
  firstName: string;
  postalCode: string;
  languageLabel: string;
  criteriaPhrase: string;
  voicemailScript: string;
};

const CRITERIA_LABELS: Record<string, string> = {
  walk_in_ok: 'walk-in availability',
  telehealth_ok: 'telehealth appointments',
  female_doctor: 'a female doctor',
  complex_care: 'complex care experience',
  mental_health: 'mental health support',
  paediatric: 'paediatric care',
};

const DEFAULT_VOICEMAIL_SCRIPT =
  'Hi, this is calling on behalf of a patient looking for a family doctor accepting new patients. Please call back at your earliest convenience. Thank you.';

export function buildTranscriptContext(
  profile: Profile | null,
  voicemailScript: string | null
): TranscriptContext {
  const criteriaLabels = (profile?.criteria ?? [])
    .map((c) => CRITERIA_LABELS[c])
    .filter(Boolean);
  const languageLabel =
    profile?.language === 'other'
      ? profile.languageOther ?? 'English'
      : LANGUAGE_LABELS[profile?.language ?? 'en'] ?? 'English';

  return {
    firstName: profile?.firstName || 'the patient',
    postalCode: profile?.postalCode || 'downtown Toronto',
    languageLabel,
    criteriaPhrase:
      criteriaLabels.length > 0 ? criteriaLabels.join(', ') : 'no special requirements',
    voicemailScript: voicemailScript || DEFAULT_VOICEMAIL_SCRIPT,
  };
}

// ── Templates ───────────────────────────────────────────────
// Transcripts are stored as newline-joined "Agent: ..." / "Clinic: ..." lines,
// the format the clinic detail page already parses into chat bubbles.

type TranscriptLine = { speaker: 'agent' | 'clinic'; text: string };

function pickTemplate(
  templates: Array<(clinic: Clinic, ctx: TranscriptContext) => TranscriptLine[]>,
  clinic: Clinic,
  ctx: TranscriptContext
): TranscriptLine[] {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(clinic, ctx);
}

const ACCEPTED_TEMPLATES: Array<(clinic: Clinic, ctx: TranscriptContext) => TranscriptLine[]> = [
  (clinic, ctx) => [
    { speaker: 'agent', text: `Hi, I'm calling on behalf of ${ctx.firstName}, who is looking for a family doctor accepting new patients. Are you taking new patients?` },
    { speaker: 'clinic', text: "Yes, we're currently accepting new patients. Is there anything specific they need?" },
    { speaker: 'agent', text: `They're located near ${ctx.postalCode}, speak ${ctx.languageLabel}, and prefer ${ctx.criteriaPhrase}. Would that be a fit?` },
    { speaker: 'clinic', text: `Sounds good. We can book a meet and greet. Have them call us at ${clinic.phone} to schedule.` },
    { speaker: 'agent', text: "Thank you. I'll pass that along." },
  ],
  (clinic, ctx) => [
    { speaker: 'agent', text: `Good morning, this is an assistant calling for ${ctx.firstName}. They're searching for a family doctor in the ${clinic.neighborhood} area. Is your clinic taking new patients right now?` },
    { speaker: 'clinic', text: 'We are, yes. One of our physicians opened their roster this month.' },
    { speaker: 'agent', text: `Great. ${ctx.firstName} lives near ${ctx.postalCode} and is looking for ${ctx.criteriaPhrase}. Anything they should know before registering?` },
    { speaker: 'clinic', text: `Just bring a health card to the first visit. They can call ${clinic.phone} or register through our website.` },
    { speaker: 'agent', text: "Perfect, I'll let them know. Thanks for your time." },
  ],
];

const REJECTED_TEMPLATES: Array<(clinic: Clinic, ctx: TranscriptContext) => TranscriptLine[]> = [
  (_clinic, ctx) => [
    { speaker: 'agent', text: `Hi, I'm calling on behalf of ${ctx.firstName}, who is looking for a family doctor accepting new patients. Are you taking new patients?` },
    { speaker: 'clinic', text: "I'm sorry, our roster is full at the moment and we aren't taking new patients." },
    { speaker: 'agent', text: 'Understood. Do you keep a waitlist, or expect openings soon?' },
    { speaker: 'clinic', text: "Not at this time. We'd suggest checking back in a few months." },
    { speaker: 'agent', text: 'Thanks for letting me know.' },
  ],
  (_clinic, ctx) => [
    { speaker: 'agent', text: `Hello, I'm calling for ${ctx.firstName} near ${ctx.postalCode}. Is your clinic accepting new family practice patients?` },
    { speaker: 'clinic', text: 'Unfortunately no. Our physicians closed their rosters earlier this year.' },
    { speaker: 'agent', text: 'No problem. Thank you for your time.' },
  ],
];

const VOICEMAIL_TEMPLATES: Array<(clinic: Clinic, ctx: TranscriptContext) => TranscriptLine[]> = [
  (clinic, ctx) => [
    { speaker: 'clinic', text: `You've reached ${clinic.name}. We're unable to take your call right now. Please leave a message after the tone.` },
    { speaker: 'agent', text: ctx.voicemailScript },
  ],
  (clinic, ctx) => [
    { speaker: 'clinic', text: `Thank you for calling ${clinic.name}. Our front desk is currently assisting other patients. Please leave a message.` },
    { speaker: 'agent', text: ctx.voicemailScript },
    { speaker: 'agent', text: 'Voicemail left. Will flag for a follow-up attempt.' },
  ],
];

const NO_ANSWER_TEMPLATES: Array<(clinic: Clinic, ctx: TranscriptContext) => TranscriptLine[]> = [
  (clinic) => [
    { speaker: 'agent', text: `Called ${clinic.name} at ${clinic.phone}. The line rang for 45 seconds with no answer and no voicemail option. Will retry on the next run.` },
  ],
  (clinic) => [
    { speaker: 'agent', text: `No answer at ${clinic.name} (${clinic.phone}). Attempted twice within the allowed call window. Marking for retry.` },
  ],
];

// ── Result generation ───────────────────────────────────────

export function generateCallResult(
  clinic: Clinic,
  ctx: TranscriptContext,
  result: AgentRunResult
): Pick<ClinicStatus, 'callTranscript' | 'capturedCriteria'> {
  const templates =
    result === 'accepted'
      ? ACCEPTED_TEMPLATES
      : result === 'rejected'
      ? REJECTED_TEMPLATES
      : result === 'voicemail_left'
      ? VOICEMAIL_TEMPLATES
      : NO_ANSWER_TEMPLATES;

  const lines = pickTemplate(templates, clinic, ctx);
  const callTranscript = lines
    .map((l) => `${l.speaker === 'agent' ? 'Agent' : 'Clinic'}: ${l.text}`)
    .join('\n');

  let capturedCriteria: ClinicStatus['capturedCriteria'] = null;
  if (result === 'accepted') {
    capturedCriteria = {
      postalCodesAccepted: [ctx.postalCode],
      ageRangeMin: null,
      ageRangeMax: null,
      familySizeLimit: Math.random() < 0.5 ? null : 4 + Math.floor(Math.random() * 3),
      inPersonOk: true,
      telehealthOk: clinic.telehealthOk,
    };
  } else if (result === 'rejected') {
    capturedCriteria = {
      postalCodesAccepted: [],
      ageRangeMin: null,
      ageRangeMax: null,
      familySizeLimit: null,
      inPersonOk: false,
      telehealthOk: false,
    };
  }

  return { callTranscript, capturedCriteria };
}
