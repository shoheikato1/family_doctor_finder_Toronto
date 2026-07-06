// The one place that decides where clinic data comes from (move S3 isolation
// rule): demo mode reads the 11-clinic mock seed, real mode reads the store's
// catalog (scout results + clinics referenced by calls and shortlist rows).
// Pages import from here, never from src/mock/clinics directly, so mock
// clinics cannot leak into real mode.
import { isRealMode } from './backendMode';
import { useAppStore } from '../store/useAppStore';
import type { Clinic } from '../store/types';
// Demo-mode data source (unused in real mode); LANGUAGE_LABELS is a plain
// label map shared by both modes.
import { MOCK_CLINICS, LANGUAGE_LABELS } from '../mock/clinics';

export { LANGUAGE_LABELS };

/** Reactive clinic catalog for the active backend mode. */
export function useClinicCatalog(): Clinic[] {
  const realClinics = useAppStore((s) => s.clinics);
  return isRealMode ? realClinics : MOCK_CLINICS;
}
