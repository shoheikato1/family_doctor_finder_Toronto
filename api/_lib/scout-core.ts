// Scout core (move S2): Google Places API (New) discovery shared by /api/scout
// (standalone scout run) and /api/run/start (scout as part of a calling run).
//
// Fork F3 is locked in here: Text Search uses an Essentials-tier FieldMask ONLY
// (id, displayName, location, types); contact fields come from at most
// MAX_CLINICS_PER_RUN Place Details calls. Never widen the Text Search FieldMask.
import { supabaseAdmin } from './supabase';
import { logCost } from './costs';
import { logEvent } from './log';
import { fsaCentroid, distanceKm } from './fsa';
import {
  MAX_CLINICS_PER_RUN,
  PLACES_TEXT_SEARCH_USD,
  PLACES_DETAILS_USD,
} from './config';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const SEARCH_QUERIES = ['family doctor', 'family practice', 'medical clinic'];

// Reject non-primary-care places by type (battle plan S2: no hospitals, dentists,
// pharmacies, or specialists; the third-order nuisance-call consequence).
const EXCLUDED_TYPES = new Set([
  'hospital',
  'dentist',
  'dental_clinic',
  'dental_lab',
  'pharmacy',
  'drugstore',
  'physiotherapist',
  'chiropractor',
  'veterinary_care',
  'skin_care_clinic',
  'spa',
  'optician',
  'eye_care_center',
  'psychologist',
  'massage',
]);

export class ScoutError extends Error {
  constructor(
    public httpStatus: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface TextSearchPlace {
  id: string;
  displayName?: { text?: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
}

interface PlaceDetails {
  id: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  formattedAddress?: string;
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
}

export interface ScoutedClinic {
  id: string; // clinics.id (uuid)
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

/**
 * Run the scout for a user: resolve FSA centroid, Text Search x3, dedupe, filter,
 * Place Details for the top candidates, upsert into clinics.
 * `costRef` tags the cost_events rows (run id when available).
 */
export async function scoutClinics(userId: string, costRef: string): Promise<ScoutedClinic[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new ScoutError(503, 'not_configured', 'GOOGLE_PLACES_API_KEY missing');

  const sb = supabaseAdmin();

  // User-scoped reads (service-role client, explicit user filter: Z3 rule).
  const [{ data: profile }, { data: settings }] = await Promise.all([
    sb.from('profiles').select('postal_code').eq('user_id', userId).maybeSingle(),
    sb.from('agent_settings').select('search_radius_km').eq('user_id', userId).maybeSingle(),
  ]);
  if (!profile || !profile.postal_code) {
    throw new ScoutError(422, 'profile_incomplete', 'profile postal code missing; finish onboarding first');
  }
  const centroid = fsaCentroid(profile.postal_code);
  if (!centroid) {
    throw new ScoutError(422, 'fsa_unknown', `postal code "${profile.postal_code}" is not a Toronto (M-prefix) FSA`);
  }
  const radiusKm = Math.min(Math.max(Number(settings?.search_radius_km ?? 5), 1), 50);
  const radiusMeters = Math.round(radiusKm * 1000);

  // ── Text Search x3, Essentials FieldMask only (fork F3) ────────────────────
  const seen = new Map<string, TextSearchPlace>();
  for (const query of SEARCH_QUERIES) {
    const resp = await fetch(TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Essentials tier: ids, names, location, types. Nothing else, ever (F3).
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types',
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: centroid.lat, longitude: centroid.lng },
            radius: radiusMeters,
          },
        },
        maxResultCount: 20,
      }),
    });
    await logCost('google_places', 'text_search_essentials', 1, PLACES_TEXT_SEARCH_USD, costRef);
    if (!resp.ok) {
      const body = await resp.text();
      logEvent({ evt: 'places_text_search_failed', status: resp.status, query, body: body.slice(0, 500) });
      throw new ScoutError(502, 'places_error', `Places Text Search failed with ${resp.status}`);
    }
    const json = (await resp.json()) as { places?: TextSearchPlace[] };
    for (const place of json.places ?? []) {
      if (place.id && !seen.has(place.id)) seen.set(place.id, place);
    }
  }

  // ── Filter: drop excluded types and out-of-radius results ──────────────────
  // locationBias biases but does not restrict, so distance is re-checked here.
  const candidates = [...seen.values()].filter(p => {
    if ((p.types ?? []).some(t => EXCLUDED_TYPES.has(t))) return false;
    if (p.location) {
      const d = distanceKm(centroid.lat, centroid.lng, p.location.latitude, p.location.longitude);
      if (d > radiusKm) return false;
    }
    return true;
  });
  const top = candidates.slice(0, MAX_CLINICS_PER_RUN);
  logEvent({
    evt: 'scout_searched',
    ref: costRef,
    found: seen.size,
    afterFilter: candidates.length,
    detailing: top.length,
  });

  // ── Place Details for at most the top 10 (contact fields live here, F3) ────
  const rows: Array<Record<string, unknown>> = [];
  for (const place of top) {
    const detailUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(place.id)}`;
    const resp = await fetch(detailUrl, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,nationalPhoneNumber,websiteUri,formattedAddress,addressComponents',
      },
    });
    await logCost('google_places', 'place_details_contact', 1, PLACES_DETAILS_USD, costRef);
    if (!resp.ok) {
      logEvent({ evt: 'places_details_failed', status: resp.status, placeId: place.id });
      continue; // one bad detail lookup does not sink the scout
    }
    const detail = (await resp.json()) as PlaceDetails;
    const componentText = (type: string): string => {
      const c = (detail.addressComponents ?? []).find(x => (x.types ?? []).includes(type));
      return c?.longText ?? c?.shortText ?? '';
    };
    rows.push({
      place_id: place.id,
      name: place.displayName?.text ?? 'Unknown clinic',
      address: detail.formattedAddress ?? '',
      neighbourhood: componentText('neighborhood') || componentText('sublocality'),
      postal_code: componentText('postal_code'),
      phone: detail.nationalPhoneNumber ?? '',
      website: detail.websiteUri ?? '',
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      last_verified_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) return [];

  // ── Upsert into the shared clinics cache (service-role only writes) ────────
  const { data: upserted, error } = await sb
    .from('clinics')
    .upsert(rows, { onConflict: 'place_id' })
    .select('id, place_id, name, address, neighbourhood, postal_code, phone, website, lat, lng');
  if (error) throw new ScoutError(500, 'db_error', `clinics upsert failed: ${error.message}`);

  // Preserve search ranking order (upsert result order is not guaranteed).
  const byPlaceId = new Map((upserted ?? []).map(c => [c.place_id as string, c]));
  const clinics: ScoutedClinic[] = [];
  for (const row of rows) {
    const c = byPlaceId.get(row.place_id as string);
    if (!c) continue;
    clinics.push({
      id: c.id,
      place_id: c.place_id,
      name: c.name,
      address: c.address,
      neighbourhood: c.neighbourhood,
      postal_code: c.postal_code,
      phone: c.phone,
      website: c.website,
      lat: c.lat,
      lng: c.lng,
      distance_km:
        c.lat != null && c.lng != null
          ? Math.round(distanceKm(centroid.lat, centroid.lng, c.lat, c.lng) * 10) / 10
          : null,
    });
  }
  logEvent({ evt: 'scout_complete', ref: costRef, clinics: clinics.length });
  return clinics;
}
