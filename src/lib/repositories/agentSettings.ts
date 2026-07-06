// Repository for the agent_settings table (move P5). Postgres owns the
// settings in real mode; the wizard/config pages upsert through here.
import { getSupabase } from '../supabaseClient';
import type { AgentSettings } from '../../store/types';

interface AgentSettingsRow {
  user_id: string;
  search_radius_km: number | string;
  call_hours_start: string;
  call_hours_end: string;
  auto_shortlist: boolean;
  voicemail_script: string;
  custom_script: string;
}

/** Postgres time comes back as 'HH:MM:SS'; the UI uses 'HH:MM'. */
function trimTime(t: string, fallback: string): string {
  const m = /^(\d{2}:\d{2})/.exec(t ?? '');
  return m ? m[1] : fallback;
}

function settingsFromRow(row: AgentSettingsRow): AgentSettings {
  return {
    userId: row.user_id,
    searchRadiusKm: Number(row.search_radius_km) || 5,
    callHoursStart: trimTime(row.call_hours_start, '09:00'),
    callHoursEnd: trimTime(row.call_hours_end, '17:00'),
    autoShortlistOnAccept: row.auto_shortlist,
    voicemailScript: row.voicemail_script,
    customDiscoveryScript: row.custom_script ? row.custom_script : null,
  };
}

export async function fetchAgentSettings(userId: string): Promise<AgentSettings | null> {
  const { data, error } = await getSupabase()
    .from('agent_settings')
    .select('user_id, search_radius_km, call_hours_start, call_hours_end, auto_shortlist, voicemail_script, custom_script')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`agent_settings fetch failed: ${error.message}`);
  return data ? settingsFromRow(data as AgentSettingsRow) : null;
}

export async function upsertAgentSettings(settings: AgentSettings): Promise<void> {
  const { error } = await getSupabase()
    .from('agent_settings')
    .upsert({
      user_id: settings.userId,
      search_radius_km: settings.searchRadiusKm,
      call_hours_start: settings.callHoursStart,
      call_hours_end: settings.callHoursEnd,
      auto_shortlist: settings.autoShortlistOnAccept,
      voicemail_script: settings.voicemailScript,
      custom_script: settings.customDiscoveryScript ?? '',
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`agent_settings upsert failed: ${error.message}`);
}
