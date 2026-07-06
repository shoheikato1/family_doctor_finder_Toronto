// Toronto FSA (forward sortation area) centroid table, server-side only.
//
// Source: approximate centroids for the geocoded "List of postal codes of Canada: M"
// dataset (Wikipedia), cross-checked against Statistics Canada 2021 Census FSA
// boundary-file centroids. Coordinates are approximate (roughly 1-3 km precision),
// which is sufficient for a Places API locationBias circle whose radius is the
// user's search radius (>= 1 km). Covers every M-prefix FSA including the
// facility/PO-box FSAs (M5K/M5L/M5W/M5X/M7A/M7R/M7Y), so any postal code a
// Toronto user types resolves.
//
// This extends the PRD's mock FSA lookup into the real server-side table (move S2).

export interface FsaCentroid {
  lat: number;
  lng: number;
}

const TORONTO_FSA_CENTROIDS: Record<string, FsaCentroid> = {
  // Scarborough
  M1B: { lat: 43.8067, lng: -79.1944 }, // Malvern / Rouge
  M1C: { lat: 43.7845, lng: -79.1605 }, // Rouge Hill / Port Union / Highland Creek
  M1E: { lat: 43.7636, lng: -79.1887 }, // Guildwood / Morningside / West Hill
  M1G: { lat: 43.7709, lng: -79.2169 }, // Woburn
  M1H: { lat: 43.7731, lng: -79.2395 }, // Cedarbrae
  M1J: { lat: 43.7447, lng: -79.2394 }, // Scarborough Village
  M1K: { lat: 43.7279, lng: -79.262 },  // Kennedy Park / Ionview
  M1L: { lat: 43.7111, lng: -79.2846 }, // Golden Mile / Oakridge
  M1M: { lat: 43.7163, lng: -79.2395 }, // Cliffside / Cliffcrest
  M1N: { lat: 43.6927, lng: -79.2648 }, // Birch Cliff
  M1P: { lat: 43.7574, lng: -79.2733 }, // Dorset Park / Wexford Heights
  M1R: { lat: 43.75, lng: -79.2958 },   // Wexford / Maryvale
  M1S: { lat: 43.7942, lng: -79.262 },  // Agincourt
  M1T: { lat: 43.7816, lng: -79.3043 }, // Clarks Corners / Tam O'Shanter
  M1V: { lat: 43.8152, lng: -79.2846 }, // Milliken / Agincourt North
  M1W: { lat: 43.7995, lng: -79.3184 }, // Steeles West / L'Amoreaux
  M1X: { lat: 43.8361, lng: -79.2056 }, // Upper Rouge
  // North York (east)
  M2H: { lat: 43.8038, lng: -79.3634 }, // Hillcrest Village
  M2J: { lat: 43.7785, lng: -79.3466 }, // Fairview / Henry Farm / Oriole
  M2K: { lat: 43.7869, lng: -79.386 },  // Bayview Village
  M2L: { lat: 43.7574, lng: -79.3747 }, // York Mills / Silver Hills
  M2M: { lat: 43.7893, lng: -79.4085 }, // Willowdale / Newtonbrook
  M2N: { lat: 43.7701, lng: -79.4085 }, // Willowdale South
  M2P: { lat: 43.7527, lng: -79.4 },    // York Mills West
  M2R: { lat: 43.7827, lng: -79.4423 }, // Willowdale West
  // North York (central/west)
  M3A: { lat: 43.7532, lng: -79.3296 }, // Parkwoods
  M3B: { lat: 43.7459, lng: -79.3522 }, // Don Mills North
  M3C: { lat: 43.7258, lng: -79.3402 }, // Don Mills South / Flemingdon Park
  M3H: { lat: 43.7543, lng: -79.4423 }, // Bathurst Manor / Wilson Heights
  M3J: { lat: 43.7679, lng: -79.4873 }, // Northwood Park / York University
  M3K: { lat: 43.7374, lng: -79.4647 }, // Downsview East
  M3L: { lat: 43.739, lng: -79.5069 },  // Downsview West
  M3M: { lat: 43.7284, lng: -79.4956 }, // Downsview Central
  M3N: { lat: 43.7616, lng: -79.5209 }, // Downsview Northwest
  // East York / East Toronto
  M4A: { lat: 43.7258, lng: -79.3156 }, // Victoria Village
  M4B: { lat: 43.7063, lng: -79.3094 }, // Parkview Hill / Woodbine Gardens
  M4C: { lat: 43.6953, lng: -79.3183 }, // Woodbine Heights
  M4E: { lat: 43.6763, lng: -79.293 },  // The Beaches
  M4G: { lat: 43.709, lng: -79.3634 },  // Leaside
  M4H: { lat: 43.7053, lng: -79.3493 }, // Thorncliffe Park
  M4J: { lat: 43.6853, lng: -79.3381 }, // East York / The Danforth
  M4K: { lat: 43.6795, lng: -79.3521 }, // Danforth West / Riverdale
  M4L: { lat: 43.6689, lng: -79.3157 }, // India Bazaar / The Beaches West
  M4M: { lat: 43.6595, lng: -79.3409 }, // Studio District / Leslieville
  // Midtown
  M4N: { lat: 43.728, lng: -79.3888 },  // Lawrence Park
  M4P: { lat: 43.7127, lng: -79.3902 }, // Davisville North
  M4R: { lat: 43.7153, lng: -79.4056 }, // North Toronto West
  M4S: { lat: 43.7043, lng: -79.3887 }, // Davisville
  M4T: { lat: 43.6896, lng: -79.3832 }, // Moore Park / Summerhill East
  M4V: { lat: 43.6864, lng: -79.4 },    // Summerhill West / Deer Park / Rathnelly
  M4W: { lat: 43.6795, lng: -79.3775 }, // Rosedale
  M4X: { lat: 43.6679, lng: -79.3676 }, // St. James Town / Cabbagetown
  M4Y: { lat: 43.6659, lng: -79.3832 }, // Church and Wellesley
  // Downtown
  M5A: { lat: 43.6543, lng: -79.3606 }, // Regent Park / Harbourfront East
  M5B: { lat: 43.6572, lng: -79.3789 }, // Garden District
  M5C: { lat: 43.6513, lng: -79.3756 }, // St. James Park
  M5E: { lat: 43.6447, lng: -79.3733 }, // Berczy Park
  M5G: { lat: 43.6579, lng: -79.3873 }, // Central Bay Street
  M5H: { lat: 43.6505, lng: -79.3845 }, // Richmond / Adelaide / King
  M5J: { lat: 43.6408, lng: -79.3818 }, // Harbourfront / Union Station
  M5K: { lat: 43.6471, lng: -79.3816 }, // Toronto Dominion Centre (PO boxes)
  M5L: { lat: 43.6481, lng: -79.3798 }, // Commerce Court (PO boxes)
  M5M: { lat: 43.7332, lng: -79.4197 }, // Bedford Park / Lawrence Manor East
  M5N: { lat: 43.7116, lng: -79.4169 }, // Roselawn
  M5P: { lat: 43.6969, lng: -79.4113 }, // Forest Hill North & West
  M5R: { lat: 43.6727, lng: -79.4056 }, // The Annex / Yorkville
  M5S: { lat: 43.6626, lng: -79.4 },    // University of Toronto / Harbord
  M5T: { lat: 43.6532, lng: -79.4 },    // Kensington Market / Chinatown
  M5V: { lat: 43.6289, lng: -79.3944 }, // CN Tower / King and Spadina
  M5W: { lat: 43.6464, lng: -79.3748 }, // Stn A PO boxes
  M5X: { lat: 43.6484, lng: -79.3822 }, // First Canadian Place (PO boxes)
  // West Toronto / York
  M6A: { lat: 43.7185, lng: -79.4648 }, // Lawrence Manor / Lawrence Heights
  M6B: { lat: 43.7096, lng: -79.445 },  // Glencairn
  M6C: { lat: 43.6937, lng: -79.4282 }, // Humewood / Cedarvale
  M6E: { lat: 43.689, lng: -79.4535 },  // Caledonia / Fairbank
  M6G: { lat: 43.669, lng: -79.4225 },  // Christie
  M6H: { lat: 43.669, lng: -79.4423 },  // Dufferin / Dovercourt Village
  M6J: { lat: 43.6479, lng: -79.4197 }, // Little Portugal / Trinity Bellwoods
  M6K: { lat: 43.6368, lng: -79.4282 }, // Brockton / Parkdale Village / Exhibition
  M6L: { lat: 43.7137, lng: -79.49 },   // North Park / Maple Leaf Park
  M6M: { lat: 43.6911, lng: -79.476 },  // Del Ray / Mount Dennis / Keelesdale
  M6N: { lat: 43.6731, lng: -79.4873 }, // Runnymede / The Junction North
  M6P: { lat: 43.6616, lng: -79.4648 }, // High Park / The Junction South
  M6R: { lat: 43.6489, lng: -79.4563 }, // Parkdale / Roncesvalles
  M6S: { lat: 43.6515, lng: -79.4844 }, // Runnymede / Swansea
  // Special / facility FSAs
  M7A: { lat: 43.6623, lng: -79.3895 }, // Queen's Park / Ontario Government
  M7R: { lat: 43.6369, lng: -79.6158 }, // Canada Post Gateway (Mississauga facility)
  M7Y: { lat: 43.6627, lng: -79.3216 }, // East Toronto business reply (enclave of M4L)
  // Etobicoke
  M8V: { lat: 43.6056, lng: -79.5013 }, // New Toronto / Mimico South / Humber Bay Shores
  M8W: { lat: 43.6024, lng: -79.5435 }, // Alderwood / Long Branch
  M8X: { lat: 43.6536, lng: -79.5069 }, // The Kingsway / Montgomery Road
  M8Y: { lat: 43.6362, lng: -79.4985 }, // Old Mill South / Sunnylea / Royal York SE
  M8Z: { lat: 43.6288, lng: -79.5209 }, // Mimico NW / The Queensway West
  M9A: { lat: 43.6678, lng: -79.5322 }, // Islington Avenue
  M9B: { lat: 43.6509, lng: -79.5547 }, // West Deane Park / Princess Gardens
  M9C: { lat: 43.6435, lng: -79.5772 }, // Eringate / Markland Wood / Old Burnhamthorpe
  M9L: { lat: 43.7563, lng: -79.5659 }, // Humber Summit
  M9M: { lat: 43.7247, lng: -79.5322 }, // Humberlea / Emery
  M9N: { lat: 43.7069, lng: -79.5182 }, // Weston
  M9P: { lat: 43.6961, lng: -79.5322 }, // Westmount
  M9R: { lat: 43.6889, lng: -79.5547 }, // Kingsview Village / St. Phillips
  M9V: { lat: 43.7394, lng: -79.5884 }, // South Steeles / Silverstone / Albion Gardens
  M9W: { lat: 43.7067, lng: -79.594 },  // Northwest Rexdale
};

/**
 * Resolve a postal code (or bare FSA) to its Toronto FSA centroid.
 * Returns null when the FSA is not a known M-prefix Toronto FSA.
 */
export function fsaCentroid(postalCode: string): FsaCentroid | null {
  const fsa = postalCode.trim().toUpperCase().slice(0, 3);
  return TORONTO_FSA_CENTROIDS[fsa] ?? null;
}

/** Great-circle distance in km (haversine). Used to post-filter Places results,
 *  because locationBias biases but does not restrict. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
