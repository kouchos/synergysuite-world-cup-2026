// Unit tests for the pure prize-tile derivations — pure Node, no browser.
// Mirrors tests/group-ranking.spec.js's style: direct imports, hand-built
// minimal state objects, plus the real mock/employees fixtures where the
// scenario calls for a realistic tournament snapshot.
import { test, expect } from '@playwright/test';
import {
  tournamentWinner,
  worstTeamRanking,
  mostCardsLeaderboard,
} from '../src/lib/state/prizes.js';
import { topScorersFrom } from '../src/lib/data/adapter.js';
import { MOCK_STATE } from '../src/lib/data/mock.js';
import employeesConfig from '../config/employees.json' with { type: 'json' };

const realEmployees = employeesConfig.employees;

// Small inline employees fixture — avoids coupling hand-built knockout/card
// scenarios to the real (and much larger) sweepstake config.
const employee = (id, name, codes) => ({
  id,
  name,
  color: '#000000',
  teams: codes.map((fifaCode) => ({ fifaCode, topTier: false })),
});

test.describe('tournamentWinner', () => {
  const final = (overrides) => ({
    knockoutMatches: [
      { round: 'Final', status: 'final', home: 'FRA', away: 'ARG', ...overrides },
    ],
  });

  test('regulation final decides on goals', () => {
    const state = final({ homeGoals: 2, awayGoals: 1 });
    const winner = tournamentWinner(state, []);
    expect(winner.team).toBe('FRA');
    expect(winner.opponent).toBe('ARG');
    expect(winner.score).toBe('2–1');
  });

  test('final decided on penalties still produces a champion', () => {
    const state = final({ homeGoals: 2, awayGoals: 2, homeShootout: 4, awayShootout: 2 });
    const winner = tournamentWinner(state, []);
    expect(winner.team).toBe('FRA');
    expect(winner.opponent).toBe('ARG');
    expect(winner.score).toBe('2–2 (4–2 pens)');
  });

  test('penalties the other way round crowns the away side', () => {
    const state = final({ homeGoals: 1, awayGoals: 1, homeShootout: 3, awayShootout: 5 });
    const winner = tournamentWinner(state, []);
    expect(winner.team).toBe('ARG');
    expect(winner.opponent).toBe('FRA');
    expect(winner.score).toBe('1–1 (3–5 pens)');
  });

  test('level final with no shootout data yields no winner', () => {
    const state = final({ homeGoals: 1, awayGoals: 1 });
    expect(tournamentWinner(state, [])).toBeNull();
  });

  test('no Final in the bracket yields no winner', () => {
    expect(tournamentWinner({ knockoutMatches: [] }, [])).toBeNull();
  });

  test('Final not yet finished yields no winner', () => {
    const state = final({ status: 'live', homeGoals: 1, awayGoals: 1 });
    expect(tournamentWinner(state, [])).toBeNull();
  });
});

test.describe('worstTeamRanking — regression pin (MOCK_STATE)', () => {
  const ranking = worstTeamRanking(MOCK_STATE, realEmployees);
  const indexOf = (code) => ranking.findIndex((r) => r.row.fifaCode === code);

  test('Curaçao (group-stage exit) is worst overall', () => {
    const top = ranking[0];
    expect(top.row.fifaCode).toBe('CUW');
    expect(top.eliminated).toBe(true);
    expect(top.exitRound).toBe(1);
  });

  test('Iraq (0 pts, GD -4, but qualified for R32) ranks below every group-stage exit', () => {
    const iraq = ranking[indexOf('IRQ')];
    expect(iraq.eliminated).toBe(true);
    expect(iraq.exitRound).toBe(2);
    // Every entry ranked ahead of Iraq must be a group-stage exit (exitRound 1) —
    // earliest-exit-first means Iraq's later (R32) exit can never jump the queue
    // just because Group-stage-exit teams had better points/GD.
    for (const entry of ranking.slice(0, indexOf('IRQ'))) {
      expect(entry.eliminated).toBe(true);
      expect(entry.exitRound).toBe(1);
    }
  });

  test('teams still alive rank below every eliminated team', () => {
    const firstAlive = ranking.findIndex((r) => !r.eliminated);
    expect(firstAlive).toBeGreaterThan(0);
    for (const entry of ranking.slice(0, firstAlive)) expect(entry.eliminated).toBe(true);
    for (const entry of ranking.slice(firstAlive)) expect(entry.eliminated).toBe(false);
  });
});

test.describe('worstTeamRanking — earliest-exit dominates points', () => {
  // eliminatedTeams()/tieLoser() only recognise real FIFA codes (isRealTeam
  // checks the TEAMS table), so these hand-built scenarios reuse genuine
  // codes rather than placeholders like 'AAA'.
  //
  // GHA loses in the R32 (exitRound 2) despite finishing top of its group.
  // AUS advances past the R32 but loses in the R16 (exitRound 3) despite
  // finishing bottom of its group. Earliest exit must still put GHA first.
  const state = {
    groups: [
      {
        id: 'Z',
        standings: [
          { fifaCode: 'GHA', pts: 6, gd: 3, gf: 5 },
          { fifaCode: 'NOR', pts: 3, gd: 0, gf: 2 },
          { fifaCode: 'AUS', pts: 0, gd: -3, gf: 1 },
          { fifaCode: 'BIH', pts: 3, gd: 1, gf: 3 },
          { fifaCode: 'IRN', pts: 4, gd: 2, gf: 4 },
          { fifaCode: 'JOR', pts: 1, gd: -3, gf: 1 },
        ],
      },
    ],
    knockoutMatches: [
      { round: 'R32', status: 'final', home: 'GHA', away: 'NOR', homeGoals: 0, awayGoals: 1 },
      { round: 'R32', status: 'final', home: 'AUS', away: 'BIH', homeGoals: 2, awayGoals: 0 },
      { round: 'R32', status: 'final', home: 'IRN', away: 'JOR', homeGoals: 3, awayGoals: 0 },
      { round: 'R16', status: 'final', home: 'AUS', away: 'IRN', homeGoals: 0, awayGoals: 1 },
    ],
  };
  const ranking = worstTeamRanking(state, []);
  const byCode = (code) => ranking.find((r) => r.row.fifaCode === code);

  test('R32 loser exits at round 2, R16 loser exits at round 3', () => {
    expect(byCode('GHA').exitRound).toBe(2);
    expect(byCode('AUS').exitRound).toBe(3);
  });

  test('the earlier (R32) exit ranks worse than the later (R16) exit, points notwithstanding', () => {
    const iGHA = ranking.findIndex((r) => r.row.fifaCode === 'GHA');
    const iAUS = ranking.findIndex((r) => r.row.fifaCode === 'AUS');
    expect(iGHA).toBeLessThan(iAUS);
  });

  test('Third-place-match loser is exitRound 5, not 6', () => {
    const state3rd = {
      groups: [{ id: 'Y', standings: [{ fifaCode: 'GHA', pts: 0, gd: 0, gf: 0 }] }],
      knockoutMatches: [
        { round: 'Third', status: 'final', home: 'GHA', away: 'NOR', homeGoals: 0, awayGoals: 1 },
      ],
    };
    const bronze = worstTeamRanking(state3rd, []).find((r) => r.row.fifaCode === 'GHA');
    expect(bronze.eliminated).toBe(true);
    expect(bronze.exitRound).toBe(5);
  });
});

test.describe('mostCardsLeaderboard — deterministic tiebreaks', () => {
  test('level on points, more reds ranks first', () => {
    const state = {
      fixtures: [
        { id: 'f1', events: [{ type: 'red', team: 'AAA', player: 'P1', minute: 10 }] },
        {
          id: 'f2',
          events: [
            { type: 'yellow', team: 'BBB', player: 'P2', minute: 5 },
            { type: 'yellow', team: 'BBB', player: 'P3', minute: 20 },
          ],
        },
      ],
      knockoutMatches: [],
    };
    // Names chosen so alphabetical order would put Amy first — the red
    // tiebreak must override that, proving it runs before the name tiebreak.
    const employees = [employee('amy', 'Amy', ['BBB']), employee('zoe', 'Zoe', ['AAA'])];
    const board = mostCardsLeaderboard(state, employees);
    expect(board[0].points).toBe(2);
    expect(board[1].points).toBe(2);
    expect(board[0].employee.name).toBe('Zoe'); // 1 red beats 2 yellow at equal points
    expect(board[1].employee.name).toBe('Amy');
  });

  test('fully level falls back to alphabetical by name', () => {
    const state = { fixtures: [], knockoutMatches: [] };
    const employees = [employee('zoe', 'Zoe', ['AAA']), employee('amy', 'Amy', ['BBB'])];
    const board = mostCardsLeaderboard(state, employees);
    expect(board.map((r) => r.employee.name)).toEqual(['Amy', 'Zoe']);
  });
});

test.describe('topScorersFrom — deterministic tiebreak', () => {
  test('players level on goals sort alphabetically regardless of input order', () => {
    const fixturesA = [
      {
        events: [
          { type: 'goal', team: 'AAA', player: 'Zed', minute: 1 },
          { type: 'goal', team: 'BBB', player: 'Ann', minute: 2 },
        ],
      },
    ];
    const fixturesB = [
      {
        events: [
          { type: 'goal', team: 'BBB', player: 'Ann', minute: 2 },
          { type: 'goal', team: 'AAA', player: 'Zed', minute: 1 },
        ],
      },
    ];
    const a = topScorersFrom(fixturesA);
    const b = topScorersFrom(fixturesB);
    expect(a.map((s) => s.player)).toEqual(['Ann', 'Zed']);
    expect(b.map((s) => s.player)).toEqual(['Ann', 'Zed']);
  });
});
