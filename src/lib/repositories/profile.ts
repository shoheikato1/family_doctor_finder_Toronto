// Repository for the profiles table (move P5). One owner per fact: in real mode
// Postgres owns the profile; Zustand only mirrors it for the UI.
//
// Deliberately NOT persisted to Postgres (no columns in the canon schema, and
// onboarding promises OHIP "stays on your device and is never sent to a
// server"): ohipNumber, ohipSkipped, dateOfBirth. They live in client memory
// for the session only.
import { getSupabase } from '../supabaseClient';
import type { Profile } from '../../store/types';

const LANGUAGE_LABEL_BY_CODE: Record<string, string> = {
  en: 'English',
  fr: 'French',
  zh: 'Mandarin',
  yue: 'Cantonese',
  pa: 'Punjabi',
  tl: 'Tagalog',
};

const LANGUAGE_CODE_BY_LABEL: Record<string, Profile['language']> = {
  English: 'en',
  French: 'fr',
  Mandarin: 'zh',
  Cantonese: 'yue',
  Punjabi: 'pa',
  Tagalog: 'tl',
};

interface ProfileRow {
  user_id: string;
  first_name: string;
  last_name: string;
  postal_code: string;
  language: string;
  family_size: number;
  criteria: unknown;
  additional_notes: string;
}

/** DB stores the human-readable language (chain.ts feeds it to the agent verbatim). */
function languageToDb(profile: Profile): string {
  if (profile.language === 'other') {
    return (profile.languageOther ?? '').trim() || 'English';
  }
  return LANGUAGE_LABEL_BY_CODE[profile.language] ?? 'English';
}

function profileFromRow(row: ProfileRow): Profile {
  const code = LANGUAGE_CODE_BY_LABEL[row.language];
  const familySize = Math.min(Math.max(Math.round(row.family_size || 1), 1), 6) as Profile['familySize'];
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    postalCode: row.postal_code,
    ohipNumber: '',
    ohipSkipped: false,
    dateOfBirth: '',
    language: code ?? 'other',
    languageOther: code ? null : row.language,
    familySize,
    criteria: Array.isArray(row.criteria) ? (row.criteria as Profile['criteria']) : [],
    additionalNotes: row.additional_notes || null,
    isComplete: Boolean(row.first_name && row.postal_code),
  };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('user_id, first_name, last_name, postal_code, language, family_size, criteria, additional_notes')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`profile fetch failed: ${error.message}`);
  return data ? profileFromRow(data as ProfileRow) : null;
}

export async function upsertProfile(profile: Profile): Promise<void> {
  const { error } = await getSupabase()
    .from('profiles')
    .upsert({
      user_id: profile.userId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      postal_code: profile.postalCode,
      language: languageToDb(profile),
      family_size: profile.familySize,
      criteria: profile.criteria,
      additional_notes: profile.additionalNotes ?? '',
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`profile upsert failed: ${error.message}`);
}
