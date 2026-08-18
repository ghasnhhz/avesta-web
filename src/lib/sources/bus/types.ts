import type {UnavailableReason} from '../types';
import type {Carrier} from './carriers';
import type {BusCity} from './locations';

export type Stamp = {date: string; time: string};

export type Trip = {
  /** Carrier-side id. The seat-map path takes it with fromId and toId. */
  id: number;
  /** Null for an api_id we have not seen — the trip still lists, loudly. */
  carrier: Carrier | null;
  transporter: string;
  busModel: string;
  origin: BusCity;
  destination: BusCity;
  /** Upstream's own labels for the two ends of this leg, not the through route. */
  originName: string;
  destinationName: string;
  /** Trip-record ID space (314/298), never the search codes. */
  fromId: number;
  toId: number;
  departure: Stamp;
  /** Null when upstream returns arrive_at equal to departure_at. */
  arrival: Stamp | null;
  /** trip_time, an hour before departure. Boarding, never shown as departure. */
  boarding: Stamp | null;
  priceSum: number | null;
  seats: number;
  soldSeats: number;
  availableSeats: number;
  available: boolean;
  unavailableReason?: UnavailableReason;
  /** Sortable wall-clock departure, e.g. "2026-08-19T13:00". */
  sortKey: string;
};

export type BusSearch = {
  trips: Trip[];
  /** Upstream's own count for the requested date. */
  count: number;
  /** count > 0 with no trips returned: upstream is holding services back. */
  incomplete: boolean;
};

export type SeatGender = 'men' | 'women';

export type BusSeat = {
  id: number;
  number: number;
  /** Grid coordinates, enough to draw the real layout. */
  x: number;
  y: number;
  z: number;
  type: number;
  sold: boolean;
  /**
   * Seats are allocated by gender and the API enforces it, so a bus with free
   * seats may have none free for a given tourist — CLAUDE.md rule 5.
   */
  gender: SeatGender | null;
};

export type BusSeatMap = {
  tripId: number;
  seats: BusSeat[];
  priceSum: number | null;
};
