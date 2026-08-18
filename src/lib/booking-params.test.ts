import {describe, expect, it} from 'vitest';
import {readBookingParams} from './booking-params';

// today is injected rather than read from the clock, so these stay pure.
const TODAY = '2026-08-19';

const valid = {
  from: 'Tashkent',
  to: 'Samarkand',
  date: '2026-08-26',
  train: '082Ф',
  dep: '21:12'
};

describe('readBookingParams', () => {
  it('reads the journey and the train the link names', () => {
    expect(readBookingParams(valid, TODAY)).toEqual({
      status: 'ok',
      query: {from: 'Tashkent', to: 'Samarkand', date: '2026-08-26'},
      ref: {train: '082Ф', departure: '21:12'}
    });
  });

  it('keeps Cyrillic train numbers intact', () => {
    const {ref} = readBookingParams({...valid, train: '3П-127Ф'}, TODAY) as {ref: {train: string}};
    expect(ref.train).toBe('3П-127Ф');
  });

  it('reports a journey that is wrong exactly as the results page does', () => {
    expect(readBookingParams({...valid, from: 'Paris'}, TODAY)).toEqual({
      status: 'unknown_city',
      city: 'Paris'
    });
    expect(readBookingParams({...valid, date: '2026-02-31'}, TODAY).status).toBe('bad_date');
    expect(readBookingParams({...valid, date: '2026-08-18'}, TODAY).status).toBe('past_date');
  });

  it('reports nothing to open when the train reference is absent', () => {
    expect(readBookingParams({...valid, train: undefined}, TODAY)).toEqual({status: 'missing'});
    expect(readBookingParams({...valid, dep: ''}, TODAY)).toEqual({status: 'missing'});
  });

  it('does not half-guess a repeated parameter', () => {
    expect(readBookingParams({...valid, train: ['082Ф', '080Ф']}, TODAY)).toEqual({
      status: 'missing'
    });
  });

  it('leaves an unrecognisable train to the live data rather than rejecting it', () => {
    // Whether a well-formed reference names a service that is still running is a
    // question only the railway can answer, and buildBooking asks it.
    expect(readBookingParams({...valid, train: 'nonsense', dep: '99:99'}, TODAY).status).toBe('ok');
  });
});
