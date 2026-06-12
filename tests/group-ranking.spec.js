// Unit tests for the FIFA group-stage ranking rules — pure Node, no browser.
// rankGroup gets the rows in baseline (draw) order, the way the adapter does,
// and must return them in competition order.
import { test, expect } from '@playwright/test';
import { rankGroup, rankGroups, fairPlayPoints } from '../src/lib/state/groupRanking.js';

const row = (fifaCode, pts, gd = 0, gf = 0) => ({ fifaCode, pts, gd, gf });
const codesOf = (rows) => rows.map((r) => r.fifaCode);

test.describe('rankGroup — overall criteria (1–3)', () => {
  test('orders by points', () => {
    // The bug report: draw order MEX, RSA, KOR, CZE with RSA (0 pts) shown 2nd
    const standings = [row('MEX', 3, 2, 2), row('RSA', 0, -2, 0), row('KOR', 3, 1, 1), row('CZE', 0, -1, 0)];
    expect(codesOf(rankGroup(standings, []))).toEqual(['MEX', 'KOR', 'CZE', 'RSA']);
  });

  test('breaks point ties on goal difference', () => {
    const standings = [row('AAA', 3, 1, 1), row('BBB', 3, 3, 3)];
    expect(codesOf(rankGroup(standings, []))).toEqual(['BBB', 'AAA']);
  });

  test('breaks point + GD ties on goals scored', () => {
    const standings = [row('AAA', 4, 1, 2), row('BBB', 4, 1, 5)];
    expect(codesOf(rankGroup(standings, []))).toEqual(['BBB', 'AAA']);
  });
});

test.describe('rankGroup — head-to-head criteria (4–6)', () => {
  const fx = (home, away, homeGoals, awayGoals, status = 'final') => ({
    home,
    away,
    homeGoals,
    awayGoals,
    status,
    events: [],
  });

  test('teams tied on pts/GD/GF rank by their head-to-head result', () => {
    const standings = [row('AAA', 4, 0, 3), row('BBB', 4, 0, 3)];
    // BBB beat AAA when they met → BBB first despite identical overall stats
    const fixtures = [fx('AAA', 'BBB', 0, 1), fx('AAA', 'CCC', 3, 2), fx('BBB', 'CCC', 2, 2)];
    expect(codesOf(rankGroup(standings, fixtures))).toEqual(['BBB', 'AAA']);
  });

  test('head-to-head only applies within the tied subset', () => {
    // CCC beat AAA, but CCC has fewer points — must stay below both
    const standings = [row('AAA', 6, 2, 4), row('BBB', 6, 2, 4), row('CCC', 3, -4, 1)];
    const fixtures = [fx('CCC', 'AAA', 1, 0), fx('BBB', 'AAA', 0, 1)];
    expect(codesOf(rankGroup(standings, fixtures))).toEqual(['AAA', 'BBB', 'CCC']);
  });

  test('live matches count toward head-to-head', () => {
    const standings = [row('AAA', 4, 0, 3), row('BBB', 4, 0, 3)];
    const fixtures = [{ ...fx('AAA', 'BBB', 0, 2), status: 'live' }];
    expect(codesOf(rankGroup(standings, fixtures))).toEqual(['BBB', 'AAA']);
  });

  test('fair play decides when head-to-head is level', () => {
    const standings = [row('AAA', 4, 0, 3), row('BBB', 4, 0, 3)];
    const fixtures = [
      {
        ...fx('AAA', 'BBB', 1, 1),
        events: [{ type: 'yellow', team: 'AAA', player: 'Dirty Harry', minute: 12 }],
      },
    ];
    expect(codesOf(rankGroup(standings, fixtures))).toEqual(['BBB', 'AAA']);
  });

  test('fully inseparable teams keep the upstream draw order', () => {
    const standings = [row('MEX', 0), row('RSA', 0), row('KOR', 0), row('CZE', 0)];
    expect(codesOf(rankGroup(standings, []))).toEqual(['MEX', 'RSA', 'KOR', 'CZE']);
  });
});

test.describe('fairPlayPoints', () => {
  const codes = new Set(['AAA', 'BBB']);
  const match = (events) => [{ home: 'AAA', away: 'BBB', status: 'final', events }];

  test('yellow −1, lone red −4', () => {
    const fp = fairPlayPoints(
      match([
        { type: 'yellow', team: 'AAA', player: 'P1' },
        { type: 'red', team: 'BBB', player: 'P2' },
      ]),
      codes,
    );
    expect(fp.get('AAA')).toBe(-1);
    expect(fp.get('BBB')).toBe(-4);
  });

  test('second-yellow dismissal −3, yellow + direct red −5', () => {
    const fp = fairPlayPoints(
      match([
        { type: 'yellow', team: 'AAA', player: 'P1' },
        { type: 'yellow', team: 'AAA', player: 'P1' },
        { type: 'red', team: 'AAA', player: 'P1' },
        { type: 'yellow', team: 'BBB', player: 'P2' },
        { type: 'red', team: 'BBB', player: 'P2' },
      ]),
      codes,
    );
    expect(fp.get('AAA')).toBe(-3);
    expect(fp.get('BBB')).toBe(-5);
  });

  test('cards accumulate per match, not across matches', () => {
    // A yellow in each of two matches is −1 −1, not a −3 "second yellow"
    const fixtures = [
      { home: 'AAA', away: 'BBB', status: 'final', events: [{ type: 'yellow', team: 'AAA', player: 'P1' }] },
      { home: 'BBB', away: 'AAA', status: 'final', events: [{ type: 'yellow', team: 'AAA', player: 'P1' }] },
    ];
    expect(fairPlayPoints(fixtures, codes).get('AAA')).toBe(-2);
  });
});

test('rankGroups sorts every group and leaves other fields alone', () => {
  const groups = [
    { id: 'A', standings: [row('RSA', 0), row('MEX', 3)] },
    { id: 'B', standings: [row('CZE', 1, 0, 1), row('KOR', 1, 0, 2)] },
  ];
  const ranked = rankGroups(groups, []);
  expect(ranked.map((g) => g.id)).toEqual(['A', 'B']);
  expect(codesOf(ranked[0].standings)).toEqual(['MEX', 'RSA']);
  expect(codesOf(ranked[1].standings)).toEqual(['KOR', 'CZE']);
});
