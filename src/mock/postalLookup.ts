export const POSTAL_LOOKUP: Record<string, string> = {
  M4K: 'Riverdale',
  M4M: 'Leslieville',
  M4E: 'The Beaches',
  M4X: 'Cabbagetown',
  M4S: 'Davisville',
  M5R: 'The Annex / Yorkville',
  M5V: 'King West',
  M6N: 'The Junction',
  M6P: 'High Park',
  M6J: 'Trinity Bellwoods',
  M6K: 'Parkdale / Liberty Village',
  M6H: 'Bloordale',
  M5P: 'Forest Hill',
  M4G: 'Leaside',
};

export function lookupNeighborhood(postalCode: string): string | null {
  const fsa = postalCode.replace(/\s/g, '').slice(0, 3).toUpperCase();
  return POSTAL_LOOKUP[fsa] ?? null;
}
