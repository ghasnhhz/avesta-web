import {beforeEach, describe, expect, it} from 'vitest';
import {emptyPassenger, type PartyDraft} from './passengers';
import {DRAFT_TTL_MS, clearDraft, readDraft, writeDraft} from './passenger-draft';

const NOW = 1_766_000_000_000;

/** sessionStorage without a DOM. The tests run in node, like every other suite. */
function memory(): Storage {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear()
  };
}

const party: PartyDraft = {
  passengers: [
    {
      surname: 'MULLER',
      firstName: 'ANNA',
      birthDate: '1990-04-02',
      gender: 'female',
      passportNumber: 'C01X00T47',
      country: 'DE'
    }
  ],
  email: 'anna@example.com'
};

let storage: Storage;
beforeEach(() => {
  storage = memory();
});

describe('surviving a dropped connection', () => {
  it('gives back the draft that was typed, so four passports are not retyped', () => {
    writeDraft(storage, party, NOW);

    expect(readDraft(storage, NOW + 60_000)).toEqual(party);
  });

  it('has nothing to give back before anything is typed', () => {
    expect(readDraft(storage, NOW)).toBeNull();
  });

  it('forgets the draft when it is cleared', () => {
    writeDraft(storage, party, NOW);
    clearDraft(storage);

    expect(readDraft(storage, NOW)).toBeNull();
  });
});

describe('the two hour limit', () => {
  it('still restores a draft inside the window', () => {
    writeDraft(storage, party, NOW);

    expect(readDraft(storage, NOW + DRAFT_TTL_MS - 1)).toEqual(party);
  });

  it('drops passport numbers left in a tab nobody closed', () => {
    // sessionStorage dies with the tab. This is for the tab that does not die.
    writeDraft(storage, party, NOW);

    expect(readDraft(storage, NOW + DRAFT_TTL_MS + 1)).toBeNull();
  });

  it('erases an expired draft rather than leaving it in storage unread', () => {
    writeDraft(storage, party, NOW);
    readDraft(storage, NOW + DRAFT_TTL_MS + 1);

    expect(storage.getItem('avesta.passengers')).toBeNull();
  });
});

describe('anything that is not what we wrote', () => {
  it('discards a damaged draft instead of restoring half a passenger', () => {
    // A half-restored passenger is worse than an empty form: the tourist has to
    // notice which field went missing.
    storage.setItem('avesta.passengers', '{not json');
    expect(readDraft(storage, NOW)).toBeNull();

    storage.setItem('avesta.passengers', JSON.stringify({savedAt: NOW, draft: {email: 'a@b.co'}}));
    expect(readDraft(storage, NOW)).toBeNull();

    storage.setItem(
      'avesta.passengers',
      JSON.stringify({savedAt: NOW, draft: {passengers: [{surname: 'MULLER'}], email: 'a@b.co'}})
    );
    expect(readDraft(storage, NOW)).toBeNull();
  });

  it('refuses a party larger than an order can hold', () => {
    storage.setItem(
      'avesta.passengers',
      JSON.stringify({
        savedAt: NOW,
        draft: {passengers: Array.from({length: 5}, emptyPassenger), email: 'a@b.co'}
      })
    );

    expect(readDraft(storage, NOW)).toBeNull();
  });
});

describe('a browser that refuses storage', () => {
  it('loses the convenience and keeps the form', () => {
    // Safari's private mode throws on access. That is a reason to lose a draft,
    // never a reason to lose the screen.
    expect(() => writeDraft(undefined, party, NOW)).not.toThrow();
    expect(() => clearDraft(undefined)).not.toThrow();
    expect(readDraft(undefined, NOW)).toBeNull();
  });
});
