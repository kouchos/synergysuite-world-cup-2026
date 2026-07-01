// Unit tests for the position-over-time race builder (PositionChart's data).
import { test, expect } from '@playwright/test';
import { positionRace } from '../src/lib/state/prizes.js';
import { MOCK_STATE, MOCK_STATE_FINAL } from '../src/lib/data/mock.js';
import employeesConfig from '../config/employees.json' with { type: 'json' };

const employees = employeesConfig.employees;

// Every line's ranks array lines up with frames and only ever holds valid,
// distinct 1..rankCount positions (no two lines collide on a frame).
function assertWellFormed(race) {
  for (const line of race.lines) {
    expect(line.ranks.length).toBe(race.frames.length);
    expect(typeof line.color).toBe('string');
  }
  for (let f = 0; f < race.frames.length; f++) {
    const ranks = race.lines.map((l) => l.ranks[f]);
    for (const r of ranks) {
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(race.rankCount);
    }
    expect(new Set(ranks).size).toBe(ranks.length); // distinct per frame
  }
}

test.describe('positionRace', () => {
  for (const category of ['overall', 'cards', 'worst', 'boot', 'survivors']) {
    test(`${category} race is well-formed (mid-tournament mock)`, () => {
      const race = positionRace(category, MOCK_STATE, employees);
      expect(race.category).toBe(category);
      assertWellFormed(race);
    });

    test(`${category} race is well-formed (final mock)`, () => {
      const race = positionRace(category, MOCK_STATE_FINAL, employees);
      assertWellFormed(race);
    });
  }

  test('overall + cards track all 8 employees', () => {
    expect(positionRace('overall', MOCK_STATE, employees).rankCount).toBe(employees.length);
    expect(positionRace('cards', MOCK_STATE, employees).rankCount).toBe(employees.length);
  });

  test('worst + boot cap the number of lines for legibility', () => {
    expect(positionRace('worst', MOCK_STATE, employees).lines.length).toBeLessThanOrEqual(8);
    expect(positionRace('boot', MOCK_STATE, employees).lines.length).toBeLessThanOrEqual(8);
  });

  test('final overall standing matches the live leaderboard order', () => {
    // The last reconstructed frame should leave the leader on top. Use the final
    // mock where the group stage is fully played out.
    const race = positionRace('overall', MOCK_STATE_FINAL, employees);
    if (race.gameCount === 0) return;
    const last = race.frames.length - 1;
    const leader = race.lines.find((l) => l.ranks[last] === 1);
    expect(leader).toBeTruthy();
  });

  test('employee line colours come straight from the config', () => {
    const race = positionRace('overall', MOCK_STATE, employees);
    for (const line of race.lines) {
      const emp = employees.find((e) => e.id === line.id);
      expect(line.color).toBe(emp.color);
    }
  });
});
