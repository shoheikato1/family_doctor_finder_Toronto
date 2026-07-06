// cost_events writer. Every billable provider request logs exactly one row here
// with the unit prices from api/_lib/config.ts (battle-plan recon citations).
// Cost caps read these rows; enforcement lives in /api/run/start (Z2).
import { supabaseAdmin } from './supabase';
import { logEvent } from './log';

export type CostService = 'elevenlabs' | 'twilio' | 'google_places' | 'vercel' | 'supabase';

export async function logCost(
  service: CostService,
  unit: string,
  quantity: number,
  estCostUsd: number,
  ref: string,
): Promise<void> {
  const { error } = await supabaseAdmin().from('cost_events').insert({
    service,
    unit,
    quantity,
    est_cost_usd: estCostUsd,
    ref,
  });
  if (error) {
    // A failed cost write must be loud but must not break the pipeline.
    logEvent({ evt: 'cost_event_write_failed', service, unit, error: error.message });
  }
}

/** Sum of est_cost_usd for the current calendar month (UTC month boundary;
 *  precise enough for a kill switch that trips at whole dollars). */
export async function monthToDateSpendUsd(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data, error } = await supabaseAdmin()
    .from('cost_events')
    .select('est_cost_usd')
    .gte('occurred_at', monthStart);
  if (error) throw new Error(`cost sum failed: ${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + Number(row.est_cost_usd || 0), 0);
}
