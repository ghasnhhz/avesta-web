import {sanePriceSum} from '@/lib/validate';
import {carrier} from './carriers';
import {parseStamp} from './dates';
import type {BusCity} from './locations';
import type {BusSearch, BusSeat, BusSeatMap, SeatGender, Trip} from './types';

type RawTrip = {
  id?: unknown;
  api_id?: unknown;
  departure_at?: unknown;
  arrive_at?: unknown;
  trip_time?: unknown;
  seats?: unknown;
  sold_seats?: unknown;
  price?: unknown;
  transporter_name?: unknown;
  bus_model_name?: unknown;
  from_id?: unknown;
  to_id?: unknown;
  from_name_en?: unknown;
  to_name_en?: unknown;
};

type RawDay = {name?: unknown; count?: unknown; trips?: RawTrip[]};

const num = (value: unknown): number => (typeof value === 'number' ? value : 0);

function parseTrip(raw: RawTrip, origin: BusCity, destination: BusCity): Trip | null {
  const id = num(raw.id);
  const departure = parseStamp(raw.departure_at);
  if (!departure) {
    console.error(`[bus] dropped trip ${id}: unreadable departure_at ${JSON.stringify(raw.departure_at)}`);
    return null;
  }

  const apiId = raw.api_id;
  const owner = carrier(apiId);
  if (!owner) {
    console.error(`[bus] trip ${id} has unknown api_id ${JSON.stringify(apiId)} — no seat map host for it`);
  }

  // Equal timestamps mean the arrival is unknown, not instant. Nothing computes
  // a duration from these anywhere, so nothing can render "0 minutes".
  const arrival = raw.arrive_at === raw.departure_at ? null : parseStamp(raw.arrive_at);

  const seats = num(raw.seats);
  const soldSeats = num(raw.sold_seats);
  // There is no availability field; the count is this subtraction and nothing else.
  const availableSeats = Math.max(0, seats - soldSeats);

  const priceSum = sanePriceSum(raw.price, `bus trip ${id} ${origin}→${destination}`);

  // Sold out is checked first: a full bus is sold out whatever the price says.
  const state =
    availableSeats === 0
      ? {available: false as const, unavailableReason: 'sold_out' as const}
      : priceSum === null
        ? {available: false as const, unavailableReason: 'price_unreliable' as const}
        : {available: true as const};

  return {
    id,
    carrier: owner,
    transporter: String(raw.transporter_name ?? ''),
    busModel: String(raw.bus_model_name ?? ''),
    origin,
    destination,
    // route_name_en is the through service — "Gurlan - Urgench - Tashkent" —
    // and is not the leg the tourist is travelling.
    originName: String(raw.from_name_en ?? ''),
    destinationName: String(raw.to_name_en ?? ''),
    fromId: num(raw.from_id),
    toId: num(raw.to_id),
    departure: {date: departure.date, time: departure.time},
    arrival: arrival && {date: arrival.date, time: arrival.time},
    boarding: parseStamp(raw.trip_time),
    priceSum,
    seats,
    soldSeats,
    availableSeats,
    ...state,
    sortKey: departure.sortKey
  };
}

/**
 * `data` is one block per day, not a flat list. Only the requested date and the
 * `days`-1 after it are populated; the rest carry a real `count` with an empty
 * `trips`, so an empty array never means "no buses run".
 */
export function parseTrips(
  payload: unknown,
  origin: BusCity,
  destination: BusCity,
  date: string
): BusSearch {
  const days = (payload as {data?: RawDay[]})?.data;
  const day = Array.isArray(days) ? days.find((entry) => entry.name === date) : undefined;

  if (!day) return {trips: [], count: 0, incomplete: false};

  const count = num(day.count);
  const trips = (day.trips ?? [])
    .map((raw) => parseTrip(raw, origin, destination))
    .filter((trip): trip is Trip => trip !== null)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const incomplete = trips.length === 0 && count > 0;
  if (incomplete) {
    console.error(`[bus] ${origin}→${destination} ${date}: upstream counts ${count} trips but returned none`);
  }

  return {trips, count, incomplete};
}

type RawSeat = {id?: unknown; x?: unknown; y?: unknown; z?: unknown; type?: unknown; seat_number?: unknown};

function seatNumbers(value: unknown): Set<number> {
  return new Set(Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number') : []);
}

/**
 * Read-only. Inside the seat map `sold_seats`, `men_seats` and `women_seats` are
 * seat *numbers*, unlike `sold_seats` on a trip record, which is a count.
 */
export function parseSeatMap(payload: unknown, tripId: number): BusSeatMap {
  const raw = payload as {
    all_seats?: RawSeat[];
    men_seats?: unknown;
    women_seats?: unknown;
    trip_data?: {sold_seats?: unknown; price?: unknown};
  };

  const sold = seatNumbers(raw?.trip_data?.sold_seats);
  const men = seatNumbers(raw?.men_seats);
  const women = seatNumbers(raw?.women_seats);

  const seats: BusSeat[] = (raw?.all_seats ?? []).map((seat) => {
    const number = num(seat.seat_number);
    const gender: SeatGender | null = men.has(number) ? 'men' : women.has(number) ? 'women' : null;

    return {
      id: num(seat.id),
      number,
      x: num(seat.x),
      y: num(seat.y),
      z: num(seat.z),
      type: num(seat.type),
      sold: sold.has(number),
      gender
    };
  });

  return {
    tripId,
    seats,
    priceSum: sanePriceSum(raw?.trip_data?.price, `bus seat map ${tripId}`)
  };
}
