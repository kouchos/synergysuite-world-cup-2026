// Unit tests for refresh-cadence activity classification — pure Node, no
// browser. Mirrors tests/group-ranking.spec.js in style: import the module
// directly and exercise it against hand-built state fragments.
import { test, expect } from '@playwright/test';
import { detectActivity, intervalFor } from '../src/lib/state/activity.js';

// Anchor "now" explicitly so the tests are deterministic regardless of when
// the suite runs (World Cup 2026 group stage is well underway by this date).
const NOW = Date.parse('2026-07-02T18:00:00Z');

const match = (utc, status = 'scheduled', overrides = {}) => ({
  id: 'm1',
  home: 'MEX',
  away: 'IRQ',
  status,
  utc,
  ...overrides,
});

test.describe('detectActivity', () => {
  test('a knockout match today is matchday even with no group fixtures (the original bug)', () => {
    const state = {
      fixtures: [],
      knockoutMatches: [match('2026-07-02T20:00:00Z')],
    };
    expect(detectActivity(state, NOW)).toBe('matchday');
  });

  test('kickoff later today (23:50Z, seen from 22:00Z) is matchday', () => {
    const now = Date.parse('2026-07-02T22:00:00Z');
    const state = { fixtures: [match('2026-07-02T23:50:00Z')] };
    expect(detectActivity(state, now)).toBe('matchday');
  });

  test('kickoff just after midnight UTC (01:00Z next day, seen from 20:00Z) is still matchday', () => {
    // The old same-UTC-day string check failed this: '2026-07-03'.startsWith
    // ('2026-07-02') is false even though the kickoff is only 5h away.
    const now = Date.parse('2026-07-02T20:00:00Z');
    const state = { fixtures: [match('2026-07-03T01:00:00Z')] };
    expect(detectActivity(state, now)).toBe('matchday');
  });

  test('a kickoff more than 12h ahead is idle', () => {
    const state = { fixtures: [match('2026-07-03T07:00:00Z')] }; // 13h ahead of NOW
    expect(detectActivity(state, NOW)).toBe('idle');
  });

  test('a match more than 4h past kickoff that never went live is idle', () => {
    const state = { fixtures: [match('2026-07-02T13:00:00Z', 'scheduled')] }; // 5h ago
    expect(detectActivity(state, NOW)).toBe('idle');
  });

  test('a finished match today is idle', () => {
    const state = { fixtures: [match('2026-07-02T17:00:00Z', 'final')] };
    expect(detectActivity(state, NOW)).toBe('idle');
  });

  test('a live match anywhere wins over matchday windowing', () => {
    const state = {
      fixtures: [match('2026-08-15T12:00:00Z', 'live')], // way outside the window
      knockoutMatches: [],
    };
    expect(detectActivity(state, NOW)).toBe('live');
  });

  test('a live knockout match also counts', () => {
    const state = {
      fixtures: [],
      knockoutMatches: [match('2026-08-15T12:00:00Z', 'live')],
    };
    expect(detectActivity(state, NOW)).toBe('live');
  });

  test('null/placeholder utc values and missing arrays never throw and settle to idle', () => {
    expect(() => detectActivity({}, NOW)).not.toThrow();
    expect(detectActivity({}, NOW)).toBe('idle');
    expect(detectActivity(null, NOW)).toBe('idle');
    expect(detectActivity({ fixtures: [match(null)] }, NOW)).toBe('idle');
    expect(detectActivity({ fixtures: [match(undefined)] }, NOW)).toBe('idle');
    expect(detectActivity({ fixtures: [{ ...match('2026-07-02T18:00:00Z'), utc: 'TBD' }] }, NOW)).toBe('idle');
  });
});

test.describe('intervalFor', () => {
  test('maps each activity level to its unchanged poll cadence', () => {
    expect(intervalFor('live')).toBe(60 * 1000);
    expect(intervalFor('matchday')).toBe(5 * 60 * 1000);
    expect(intervalFor('idle')).toBe(30 * 60 * 1000);
    expect(intervalFor('anything-else')).toBe(30 * 60 * 1000);
  });
});
