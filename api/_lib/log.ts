// Structured logging: one JSON line per event (engineering.md observability rule).
// Every state transition in the pipeline emits one of these.
export function logEvent(fields: { evt: string; [key: string]: unknown }): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));
}
