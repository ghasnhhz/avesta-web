import {sanePriceSum} from '@/lib/validate';
import {parseStamp} from './dates';
import {type RailCity, stationCode} from './stations';
import type {Accommodation, BerthCounts, Train, TrainClass} from './types';

// The same response returns "СК" (Cyrillic С К) and "CK" (Latin C K) for the
// same train type. Keying off the raw string silently splits one type into two,
// so Latin confusables fold to their Cyrillic twins before `type` is used.
const CONFUSABLES: Record<string, string> = {
  A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', K: 'К', M: 'М',
  O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У'
};

function normaliseCode(value: string): string {
  return [...value].map((char) => CONFUSABLES[char] ?? char).join('');
}

// The class code is the stable key, but it names nothing a tourist understands.
// The car's own type does — and it is the only field that says what the
// accommodation is. It is unsafe as a key: under one Accept-Language it has come
// back Russian, Uzbek and English on different days. So this is a lookup over
// every spelling we have seen, with a null fallback — an unrecognised type
// renders as no name at all, never as a guess.
const ACCOMMODATION = new Map<string, Accommodation>(
  (
    [
      ['Плацкартный', 'platskart'],
      ['Sleeper', 'platskart'],
      ['Купе', 'kupe'],
      ['Coupe', 'kupe'],
      ['СВ', 'sv'],
      ['SV', 'sv'],
      ['Сидячий', 'seated'],
      ["O'rindiqli", 'seated'],
      ['Sitting', 'seated'],
      ['Общий', 'general'],
      ['General', 'general']
    ] as const
  ).map(([type, accommodation]) => [accommodationKey(type), accommodation])
);

function accommodationKey(type: string): string {
  // Uzbek types arrive with an ASCII apostrophe today; the three typographic
  // ones are the same letter and must not split the entry.
  return normaliseCode(type.toUpperCase()).replace(/[ʻʼ‘’]/g, "'");
}

function accommodationOf(type: unknown): Accommodation | null {
  if (typeof type !== 'string') return null;
  return ACCOMMODATION.get(accommodationKey(type)) ?? null;
}

type RawTariff = {classServiceType?: unknown; freeSeats?: unknown; tariff?: unknown};
type RawSeatDetail = Partial<Record<keyof BerthCounts | 'undef' | 'freeComp', number>>;
type RawCar = {
  type?: unknown;
  freeSeats?: unknown;
  tariffs?: RawTariff[];
  seatDetail?: RawSeatDetail;
};
type RawTrain = {
  number?: unknown;
  type?: unknown;
  brand?: unknown;
  departureDate?: unknown;
  arrivalDate?: unknown;
  timeOnWay?: unknown;
  cars?: RawCar[];
  subRoute?: {depStationCode?: unknown; arvStationCode?: unknown};
};

function berthCounts(seatDetail: RawSeatDetail | undefined): BerthCounts | undefined {
  if (!seatDetail) return undefined;

  const counts: BerthCounts = {
    up: seatDetail.up ?? 0,
    down: seatDetail.down ?? 0,
    lateralUp: seatDetail.lateralUp ?? 0,
    lateralDn: seatDetail.lateralDn ?? 0
  };

  // Seated cars report everything under `undef`. freeComp counts free
  // compartments, not berths, and is deliberately excluded.
  const total = counts.up + counts.down + counts.lateralUp + counts.lateralDn;
  return total > 0 ? counts : undefined;
}

function carClasses(car: RawCar, trainNumber: string): TrainClass[] {
  const tariffs = car.tariffs ?? [];
  const soleClass = tariffs.length === 1;
  const accommodation = accommodationOf(car.type);

  return tariffs.flatMap((tariff): TrainClass[] => {
    const code = typeof tariff.classServiceType === 'string' ? tariff.classServiceType : '';
    const priceSum = sanePriceSum(tariff.tariff, `train ${trainNumber} class ${code || '?'}`);
    if (!code || priceSum === null) return [];

    // Berth cars report 0 per tariff and the real count on the car; seated cars
    // report it per tariff and the car total is the sum across classes. When a
    // car carries several classes and reports nothing per tariff, the count
    // cannot be attributed to one of them, so it stays unknown.
    const perTariff = typeof tariff.freeSeats === 'number' ? tariff.freeSeats : 0;
    const carTotal = typeof car.freeSeats === 'number' ? car.freeSeats : null;
    const freeSeats = perTariff > 0 ? perTariff : soleClass ? carTotal : null;

    const berths = soleClass ? berthCounts(car.seatDetail) : undefined;

    return [{code, accommodation, priceSum, freeSeats, ...(berths ? {berths} : {})}];
  });
}

function parseTrain(raw: RawTrain, origin: RailCity, destination: RailCity): Train | null {
  const number = String(raw.number ?? '');
  const departure = parseStamp(String(raw.departureDate ?? ''));
  const arrival = parseStamp(String(raw.arrivalDate ?? ''));

  // A wrong station code returns the same response as a real one with nothing
  // running, so the leg we were actually quoted is checked against the leg we
  // asked for. originRoute is the whole through service and is not this journey.
  const sub = raw.subRoute ?? {};
  if (sub.depStationCode !== stationCode(origin) || sub.arvStationCode !== stationCode(destination)) {
    console.error(
      `[rail] dropped train ${number}: subRoute ${String(sub.depStationCode)}→${String(sub.arvStationCode)} is not ${origin}→${destination}`
    );
    return null;
  }

  const base = {
    number,
    type: normaliseCode(String(raw.type ?? '')),
    brand: String(raw.brand ?? ''),
    origin,
    destination,
    departure: {date: departure.date, time: departure.time},
    arrival: {date: arrival.date, time: arrival.time},
    timeOnWay: String(raw.timeOnWay ?? ''),
    sortKey: departure.sortKey
  };

  const cars = raw.cars ?? [];

  // An empty cars array is sold out, not missing data. It is rendered with its
  // times and no price, and is never backfilled from any static source.
  if (cars.length === 0) {
    return {...base, available: false, unavailableReason: 'sold_out', classes: []};
  }

  const classes = cars.flatMap((car) => carClasses(car, number));
  if (classes.length === 0) {
    return {...base, available: false, unavailableReason: 'price_unreliable', classes: []};
  }

  return {...base, available: true, classes};
}

export function parseTrains(
  payload: unknown,
  origin: RailCity,
  destination: RailCity
): Train[] {
  const forward = (payload as {data?: {directions?: {forward?: {trains?: RawTrain[]}}}})?.data
    ?.directions?.forward;

  // No trains comes back as an absent `forward` key, not an empty array.
  if (!forward?.trains) return [];

  return forward.trains
    .map((raw) => parseTrain(raw, origin, destination))
    .filter((train): train is Train => train !== null)
    // Upstream appends sold-out services after the bookable ones, so the list
    // arrives out of time order.
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
