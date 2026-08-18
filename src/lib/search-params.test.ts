import {describe, expect, it} from 'vitest';
import {readSearchParams} from './search-params';

// today is injected rather than read from the clock, so these stay pure.
const TODAY = '2026-08-19';

const valid = {from: 'Urgench', to: 'Tashkent', date: '2026-08-26'};

describe('readSearchParams', () => {
  it('accepts a journey between two rail cities', () => {
    expect(readSearchParams(valid, TODAY)).toEqual({
      status: 'ok',
      query: {from: 'Urgench', to: 'Tashkent', date: '2026-08-26'}
    });
  });

  it('accepts today', () => {
    expect(readSearchParams({...valid, date: TODAY}, TODAY).status).toBe('ok');
  });

  it('reports nothing to search when the query is empty', () => {
    expect(readSearchParams({}, TODAY)).toEqual({status: 'missing'});
    expect(readSearchParams({from: 'Urgench'}, TODAY)).toEqual({status: 'missing'});
  });

  it('reports an unknown city rather than searching for it', () => {
    expect(readSearchParams({...valid, to: 'Nukus'}, TODAY)).toEqual({
      status: 'unknown_city',
      city: 'Nukus'
    });
  });

  it('reports the same city chosen twice', () => {
    expect(readSearchParams({...valid, to: 'Urgench'}, TODAY)).toEqual({
      status: 'same_city',
      city: 'Urgench'
    });
  });

  it('reports a date that is not a real day', () => {
    expect(readSearchParams({...valid, date: '2026-02-31'}, TODAY)).toEqual({
      status: 'bad_date',
      date: '2026-02-31'
    });
  });

  it('reports a date that has already passed rather than quietly moving it', () => {
    expect(readSearchParams({...valid, date: '2026-08-18'}, TODAY)).toEqual({
      status: 'past_date',
      date: '2026-08-18'
    });
  });

  it('treats a repeated parameter as no parameter', () => {
    expect(readSearchParams({...valid, from: ['Urgench', 'Khiva']}, TODAY)).toEqual({
      status: 'missing'
    });
  });
});
