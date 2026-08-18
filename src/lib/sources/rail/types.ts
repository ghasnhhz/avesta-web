import type {UnavailableReason} from '../types';
import type {RailCity} from './stations';

export type {UnavailableReason};

export type BerthCounts = {
  up: number;
  down: number;
  lateralUp: number;
  lateralDn: number;
};

export type TrainClass = {
  /** classServiceType, e.g. "3П" — the code the railway prints on the ticket. */
  code: string;
  priceSum: number;
  /**
   * Null when upstream reports the count only on the car and the car carries
   * more than one class, so it cannot be attributed. Never guessed.
   */
  freeSeats: number | null;
  /**
   * Present only on berth accommodation. Feeds the lower/upper preference we
   * take at booking — no berth can be reserved in advance, by us or anyone.
   */
  berths?: BerthCounts;
};

export type Train = {
  number: string;
  /** Upstream code, e.g. "В-СКОР". Homoglyph-normalised — see parse.ts. */
  type: string;
  brand: string;
  origin: RailCity;
  destination: RailCity;
  departure: {date: string; time: string};
  arrival: {date: string; time: string};
  /** Upstream's own hh:mm, passed through. We never compute a duration. */
  timeOnWay: string;
  available: boolean;
  unavailableReason?: UnavailableReason;
  classes: TrainClass[];
  /** Sortable wall-clock departure, e.g. "2026-08-26T07:40". */
  sortKey: string;
};
