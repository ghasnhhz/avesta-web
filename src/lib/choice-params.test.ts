import {describe, expect, it} from 'vitest';
import {readChoiceParams} from './choice-params';

const TODAY = '2026-08-19';

const valid = {
  from: 'Tashkent',
  to: 'Samarkand',
  date: '2026-08-26',
  train: '082Ф',
  dep: '21:12',
  class: '3П:142980',
  berth: 'lower'
};

describe('readChoiceParams', () => {
  it('reads the class and berth the booking screen put in the link', () => {
    expect(readChoiceParams(valid, TODAY)).toEqual({
      status: 'ok',
      query: {from: 'Tashkent', to: 'Samarkand', date: '2026-08-26'},
      ref: {train: '082Ф', departure: '21:12'},
      choice: {classId: '3П:142980', berth: 'lower'}
    });
  });

  it('keeps the class id whole, because the price inside it is what gets re-checked', () => {
    const result = readChoiceParams({...valid, class: '2В:1680000'}, TODAY);

    expect(result).toMatchObject({choice: {classId: '2В:1680000'}});
  });

  it('sends a link with no class back to that train, not back to the search form', () => {
    // We know which train this is. Its own class list is the honest destination.
    expect(readChoiceParams({...valid, class: undefined}, TODAY)).toEqual({
      status: 'no_class',
      query: {from: 'Tashkent', to: 'Samarkand', date: '2026-08-26'},
      ref: {train: '082Ф', departure: '21:12'}
    });
  });

  it('treats an unreadable berth as no preference rather than refusing the link', () => {
    // Nobody can hold a berth anyway, so a preference we cannot read is not
    // worth turning a tourist away over.
    expect(readChoiceParams({...valid, berth: 'middle'}, TODAY)).toMatchObject({
      status: 'ok',
      choice: {berth: 'any'}
    });
    expect(readChoiceParams({...valid, berth: undefined}, TODAY)).toMatchObject({
      choice: {berth: 'any'}
    });
    expect(readChoiceParams({...valid, berth: ['lower', 'upper']}, TODAY)).toMatchObject({
      choice: {berth: 'any'}
    });
  });

  it('reports a wrong journey exactly as the booking screen does', () => {
    expect(readChoiceParams({...valid, from: 'Paris'}, TODAY)).toEqual({
      status: 'unknown_city',
      city: 'Paris'
    });
    expect(readChoiceParams({...valid, date: '2026-08-18'}, TODAY).status).toBe('past_date');
    expect(readChoiceParams({...valid, train: undefined}, TODAY).status).toBe('missing');
  });

  it('does not half-guess a repeated class parameter', () => {
    // Two classes is not a choice, and picking one for somebody sells them a
    // berth they did not ask for.
    expect(readChoiceParams({...valid, class: ['3П:142980', '2К:280000']}, TODAY).status).toBe(
      'no_class'
    );
  });
});
