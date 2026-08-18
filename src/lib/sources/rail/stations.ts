// Recovered city by city from POST /api/v1/handbook/stations/list — an empty
// name returns 204, so there is no way to list them all. Validated locally
// because a wrong code returns the same "no trains" response as a real code
// with nothing running, and we must be able to tell those apart.
const STATIONS = {
  Tashkent: '2900000',
  Samarkand: '2900700',
  Bukhara: '2900800',
  // Khiva has its own station and does not route via Urgench.
  Khiva: '2900172',
  Urgench: '2900790'
} as const;

export type RailCity = keyof typeof STATIONS;

export const RAIL_CITIES = Object.keys(STATIONS) as RailCity[];

export function isRailCity(name: string): name is RailCity {
  return name in STATIONS;
}

export function stationCode(city: RailCity): string {
  return STATIONS[city];
}

export class UnknownStationError extends Error {
  constructor(readonly city: string) {
    super(`No rail station code for "${city}". Known: ${RAIL_CITIES.join(', ')}`);
    this.name = 'UnknownStationError';
  }
}

export function requireStationCode(city: string): string {
  if (!isRailCity(city)) throw new UnknownStationError(city);
  return STATIONS[city];
}
