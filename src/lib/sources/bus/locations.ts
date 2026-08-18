// Two ID spaces exist and must never cross. These are the *search* codes, the
// only ones `api-locations` and `api-trips` accept. Trip records and seat-map
// paths use a different, much smaller space (`314`, `298`) that appears only in
// responses — see `fromId`/`toId` on Trip.
//
// The codes also mix granularity: 1726 is both a location and a station, 1733217
// is a station under location 1733. A code in the wrong field returns nothing
// rather than an error, so the table is validated locally.
const LOCATIONS = {
  Tashkent: 1726,
  Urgench: 1733217,
  // Khiva has its own code and is reached directly, not via Urgench.
  Khiva: 1733226,
  Hazarasp: 1733220,
  Gurlan: 1733208,
  Yangibazar: 1733236,
  Shavat: 1733230551,
  Khorezm: 1733,
  Samarkand: 1718,
  Bukhara: 1706,
  Navoi: 1712,
  Karakalpakstan: 1735
} as const;

export type BusCity = keyof typeof LOCATIONS;

export const BUS_CITIES = Object.keys(LOCATIONS) as BusCity[];

export function isBusCity(name: string): name is BusCity {
  return name in LOCATIONS;
}

export function locationId(city: BusCity): number {
  return LOCATIONS[city];
}

export class UnknownLocationError extends Error {
  constructor(readonly city: string) {
    super(`No bus location code for "${city}". Known: ${BUS_CITIES.join(', ')}`);
    this.name = 'UnknownLocationError';
  }
}

/** Narrows a free-text city to one we hold a code for, or throws. */
export function assertBusCity(name: string): BusCity {
  if (!isBusCity(name)) throw new UnknownLocationError(name);
  return name;
}
