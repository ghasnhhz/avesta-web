import {config} from 'dotenv';
import {expect, test} from 'vitest';
import {searchTrains} from '@/lib/sources/rail';

// Not part of `npm test` — vitest only collects src/**. Run deliberately:
//   npx vitest run scripts/rail.live.test.ts --include 'scripts/**/*.test.ts'
// One request, no loops, no retries.
config({path: '.env.local'});

test('searchTrains against live upstream', {timeout: 60_000}, async () => {
  const {value: trains} = await searchTrains('Urgench', 'Tashkent', '2026-08-26');

  for (const t of trains) {
    const price = t.available ? t.classes.map((c) => `${c.code} ${c.priceSum}`).join(', ') : '—';
    console.log(
      [
        t.departure.time,
        t.arrival.time,
        t.number.padEnd(5),
        t.available ? 'available' : `unavailable (${t.unavailableReason})`,
        price
      ].join('  ')
    );
  }

  expect(trains.length).toBeGreaterThan(0);
  for (const t of trains) if (!t.available) expect(t.classes).toEqual([]);
});
