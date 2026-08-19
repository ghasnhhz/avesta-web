import {afterEach, describe, expect, it, vi} from 'vitest';
import {dayOffset, isCalendarDate, journeyDate, todayInTashkent} from './dates';

afterEach(() => vi.useRealTimers());

describe('journeyDate', () => {
  it('renders as the day it says across the zones the app formats in', () => {
    const date = journeyDate('2026-08-26');

    // Midnight UTC would render as the 25th in the first of these.
    for (const timeZone of ['Pacific/Midway', 'America/New_York', 'UTC', 'Asia/Tashkent', 'Australia/Sydney']) {
      expect(new Intl.DateTimeFormat('en-CA', {timeZone}).format(date)).toBe('2026-08-26');
    }
  });
});

describe('isCalendarDate', () => {
  it('accepts a real day', () => {
    expect(isCalendarDate('2026-08-26')).toBe(true);
  });

  it('rejects a date with the right shape that is not a day', () => {
    expect(isCalendarDate('2026-02-31')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
  });

  it('rejects the format the railway returns, which is not the format we search in', () => {
    expect(isCalendarDate('26.08.2026')).toBe(false);
  });
});

describe('todayInTashkent', () => {
  it('reads today from Tashkent, not from the server clock', () => {
    // 20:30 UTC is already the next morning in Uzbekistan.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T20:30:00Z'));

    expect(todayInTashkent()).toBe('2026-08-26');
  });
});

describe('dayOffset', () => {
  it('counts an arrival after midnight as the next day', () => {
    expect(dayOffset('2026-08-26', '2026-08-27')).toBe(1);
  });

  it('counts an arrival the same day as no offset', () => {
    expect(dayOffset('2026-08-26', '2026-08-26')).toBe(0);
  });

  it('counts a two-night journey as two days later', () => {
    expect(dayOffset('2026-08-26', '2026-08-28')).toBe(2);
  });
});
