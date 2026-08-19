import {describe, expect, it} from 'vitest';
import type {Cached} from '@/lib/cache';
import type {Choice} from '@/lib/choice-params';
import type {Service, ServiceSearch, SourceStatus} from '@/lib/sources';
import {parseTrains} from '@/lib/sources/rail/parse';
import samarkand from '@/lib/sources/rail/__fixtures__/tashkent-samarkand-2026-08-19.json';
import {type BookingView, type ClassOption, buildBooking} from './booking-view';
import {buildPassengerChoice} from './passenger-view';

function search(services: Service[], rail: SourceStatus = 'ok'): Cached<ServiceSearch> {
  return {value: {services, sources: {rail, bus: 'no_access'}}, fetchedAt: 1_000, stale: false};
}

const trains: Service[] = parseTrains(samarkand, 'Tashkent', 'Samarkand').map((train) => ({
  mode: 'train' as const,
  ...train
}));

function booking(train: string, dep: string): BookingView {
  return buildBooking(search(trains), {train, departure: dep});
}

function choose(view: BookingView, classId: string, berth: Choice['berth'] = 'lower') {
  return buildPassengerChoice(view, {classId, berth});
}

// 082Ф carries three berth classes; 764Ф is seated only.
const berthTrain = () => booking('082Ф', '21:12');
const seatedTrain = () => booking('764Ф', '06:33');

/** The same booking with a different class list, for prices no fixture holds. */
function withClasses(view: BookingView, classes: ClassOption[]): BookingView {
  if (view.state !== 'ready') throw new Error(`expected ready, got ${view.state}`);
  return {...view, classes};
}

describe('the class the tourist chose', () => {
  it('carries the chosen class through when it is still listed at that price', () => {
    const result = choose(berthTrain(), '3П:142980');

    expect(result.state).toBe('ready');
    expect(result).toMatchObject({
      option: {code: '3П', quote: {ticketSum: 142_980}},
      berth: 'lower',
      train: {number: '082Ф'}
    });
  });

  it('drops the berth preference on a seated class, which has no berths to prefer', () => {
    expect(choose(seatedTrain(), '1В:709000')).toMatchObject({state: 'ready', berth: null});
  });

  it('keeps no preference as no preference', () => {
    expect(choose(berthTrain(), '3П:142980', 'any')).toMatchObject({berth: 'any'});
  });
});

describe('a fare that moved', () => {
  it('names the new price rather than the one the link was built with', () => {
    // The tourist must be shown the number they would actually pay, never a
    // recalculation of the number they were quoted a minute ago.
    const result = choose(berthTrain(), '3П:130000');

    expect(result).toMatchObject({
      state: 'price_changed',
      chosenSum: 130_000,
      option: {code: '3П', quote: {ticketSum: 142_980}}
    });
  });

  it('gives up naming a price when the code is listed at two of them', () => {
    // Picking one of two prices for somebody is inventing a fare. Sending them
    // back to the class list is the honest answer.
    const view = berthTrain();
    const ready = view.state === 'ready' ? view : null;
    const three = ready!.classes.filter((option) => option.code === '3П')[0];
    const twoPrices = withClasses(view, [three, {...three, id: '3П:151000'}]);

    expect(buildPassengerChoice(twoPrices, {classId: '3П:130000', berth: 'any'})).toMatchObject({
      state: 'class_gone',
      code: '3П'
    });
  });
});

describe('a class that is gone', () => {
  it('reports the code that vanished, so the notice can name it', () => {
    expect(choose(berthTrain(), '2Э:250000')).toMatchObject({state: 'class_gone', code: '2Э'});
  });

  it('reads a code that has no price attached without inventing one', () => {
    expect(choose(berthTrain(), '2Э')).toMatchObject({state: 'class_gone', code: '2Э'});
  });
});

describe('what upstream already answered', () => {
  it('passes every non-ready booking state straight through, unchanged', () => {
    // Sold out, a fare we refused and a railway that did not answer are already
    // said properly one module up. Saying them again here would let the two
    // drift apart.
    expect(choose(booking('084Ф', '00:00'), '3П:142980').state).toBe('not_found');
    expect(
      buildPassengerChoice(buildBooking(search([], 'failed'), {train: '082Ф', departure: '21:12'}), {
        classId: '3П:142980',
        berth: 'any'
      }).state
    ).toBe('unavailable');
    expect(
      buildPassengerChoice(
        buildBooking(search([], 'unknown_city'), {train: '082Ф', departure: '21:12'}),
        {classId: '3П:142980', berth: 'any'}
      ).state
    ).toBe('unserved');
  });

  it('passes a train that sold out since the class was chosen straight through', () => {
    const soldOut = trains.find((service) => !service.available)!;
    if (soldOut.mode !== 'train') throw new Error('the fixture is trains only');
    const view = buildBooking(search(trains), {
      train: soldOut.number,
      departure: soldOut.departure.time
    });

    expect(buildPassengerChoice(view, {classId: '3П:142980', berth: 'any'}).state).toBe('sold_out');
  });
});
