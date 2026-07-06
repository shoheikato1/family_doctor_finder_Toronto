// Repository for the shortlist table (move P5). Toggles write through from the
// store actions in real mode; Postgres is the owner, the store mirrors.
import { getSupabase } from '../supabaseClient';
import type { ShortlistEntry } from '../../store/types';

interface ShortlistRow {
  user_id: string;
  clinic_id: string;
  added_at: string;
  booking_date: string | null;
  booking_notes: string;
}

function entryFromRow(row: ShortlistRow): ShortlistEntry {
  return {
    userId: row.user_id,
    clinicId: row.clinic_id,
    addedAt: row.added_at,
    bookingDate: row.booking_date,
    bookingNotes: row.booking_notes,
  };
}

export async function fetchShortlist(userId: string): Promise<Record<string, ShortlistEntry>> {
  const { data, error } = await getSupabase()
    .from('shortlist')
    .select('user_id, clinic_id, added_at, booking_date, booking_notes')
    .eq('user_id', userId);
  if (error) throw new Error(`shortlist fetch failed: ${error.message}`);
  const entries: Record<string, ShortlistEntry> = {};
  for (const row of (data ?? []) as ShortlistRow[]) {
    entries[row.clinic_id] = entryFromRow(row);
  }
  return entries;
}

export async function addShortlistEntry(userId: string, clinicId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('shortlist')
    .upsert(
      { user_id: userId, clinic_id: clinicId },
      { onConflict: 'user_id,clinic_id', ignoreDuplicates: true },
    );
  if (error) throw new Error(`shortlist add failed: ${error.message}`);
}

export async function removeShortlistEntry(userId: string, clinicId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('shortlist')
    .delete()
    .eq('user_id', userId)
    .eq('clinic_id', clinicId);
  if (error) throw new Error(`shortlist remove failed: ${error.message}`);
}

export async function updateShortlistBooking(
  userId: string,
  clinicId: string,
  partial: { bookingDate?: string | null; bookingNotes?: string },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if ('bookingDate' in partial) patch.booking_date = partial.bookingDate;
  if ('bookingNotes' in partial) patch.booking_notes = partial.bookingNotes ?? '';
  if (Object.keys(patch).length === 0) return;
  const { error } = await getSupabase()
    .from('shortlist')
    .update(patch)
    .eq('user_id', userId)
    .eq('clinic_id', clinicId);
  if (error) throw new Error(`shortlist update failed: ${error.message}`);
}
