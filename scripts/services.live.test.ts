import {config} from 'dotenv';
import {expect, test} from 'vitest';
import {searchServices} from '@/lib/sources';

// Not part of `npm test` — vitest only collects src/**. One request per source,
// no loops, no retries.
//
// searchServices skips the bus half by default (BUS_ACCESS), so this asks for it
// explicitly. It is expected to come back `failed`: wapi.avtoticket.uz
// answers 403 to anything that is not a browser on avtoticket.uz. Keeping it
// here is the cheapest way to notice the day that changes.
config({path: '.env.local'});

test('searchServices against live upstream', {timeout: 60_000}, async () => {
  const {value, stale} = await searchServices('Urgench', 'Tashkent', '2026-08-26', {includeBus: true});

  console.log('sources:', value.sources, stale ? '(stale)' : '');
  for (const service of value.services) {
    const price = service.available
      ? service.mode === 'train'
        ? service.classes.map((c) => `${c.code} ${c.priceSum}`).join(', ')
        : String(service.priceSum)
      : '—';

    console.log(
      [
        service.departure.time,
        service.arrival ? service.arrival.time : '  —  ',
        service.mode.padEnd(5),
        (service.mode === 'train' ? service.number : String(service.id)).padEnd(6),
        service.available ? 'available' : `unavailable (${service.unavailableReason})`,
        price
      ].join('  ')
    );
  }

  const keys = value.services.map((s) => s.sortKey);
  expect([...keys].sort((a, b) => a.localeCompare(b))).toEqual(keys);
  expect(value.services.length).toBeGreaterThan(0);
});
