// Repository for the shared clinics cache (move P5, read only from the client;
// only the service role writes, via /api/scout). Also maps /api/scout response
// clinics into the UI Clinic shape so the existing card layout renders them.
import { getSupabase } from '../supabaseClient';
import type { Clinic } from '../../store/types';

interface ClinicRow {
  id: string;
  place_id: string;
  name: string;
  address: string;
  neighbourhood: string;
  postal_code: string;
  phone: string;
  website: string;
  languages: unknown;
  last_verified_at: string | null;
}

/** Shape of one clinic in the POST /api/scout response (api/_lib/scout-core.ts). */
export interface ScoutedClinicDto {
  id: string;
  place_id: string;
  name: string;
  address: string;
  neighbourhood: string;
  postal_code: string;
  phone: string;
  website: string;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
}

export interface ScoutResponse {
  run_id: string;
  clinics: ScoutedClinicDto[];
}

function toLanguages(value: unknown): Clinic['languages'] {
  return Array.isArray(value)
    ? (value.filter((v): v is string => typeof v === 'string') as Clinic['languages'])
    : [];
}

/**
 * DB rows carry no accepting/walk-in/telehealth signals (the Caller agent is
 * the source of the accepting signal, per call status); those render as
 * unknown/false rather than inventing data.
 */
export function clinicFromRow(row: ClinicRow, distanceKm: number | null = null): Clinic {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    neighborhood: row.neighbourhood,
    postalCode: row.postal_code,
    phone: row.phone,
    website: row.website,
    languages: toLanguages(row.languages),
    acceptingNewPatients: 'unknown',
    lastVerifiedAt: row.last_verified_at,
    walkInOk: false,
    telehealthOk: false,
    distanceKm,
  };
}

export function clinicFromScouted(dto: ScoutedClinicDto): Clinic {
  return {
    id: dto.id,
    name: dto.name,
    address: dto.address,
    neighborhood: dto.neighbourhood,
    postalCode: dto.postal_code,
    phone: dto.phone,
    website: dto.website,
    languages: [],
    acceptingNewPatients: 'unknown',
    lastVerifiedAt: new Date().toISOString(),
    walkInOk: false,
    telehealthOk: false,
    distanceKm: dto.distance_km,
  };
}

export async function fetchClinicsByIds(ids: string[]): Promise<Clinic[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('clinics')
    .select('id, place_id, name, address, neighbourhood, postal_code, phone, website, languages, last_verified_at')
    .in('id', ids);
  if (error) throw new Error(`clinics fetch failed: ${error.message}`);
  return ((data ?? []) as ClinicRow[]).map(row => clinicFromRow(row));
}
