export default function handler(_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  res.status(200).json({ ok: true, service: 'find-a-family-doctor', ts: new Date().toISOString() });
}
