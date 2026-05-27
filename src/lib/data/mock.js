/**
 * Mid-group-stage snapshot used by ?mock=1 and during dev before live data exists.
 * Shape matches what the (forthcoming) ESPN adapter will produce — see adapter.js.
 *
 * Each group has 4 teams with partial standings. A handful of completed matches
 * carry goalscorers + cards so the four prize leaderboards have something to chew on.
 * One match is marked live so the live-dot UI can be exercised.
 */
export const MOCK_STATE = {
  phase: 'group',
  lastUpdated: new Date('2026-06-18T19:00:00+01:00').toISOString(),
  groups: [
    {
      id: 'A',
      standings: [
        { fifaCode: 'MEX', p: 2, w: 2, d: 0, l: 0, gf: 5, ga: 1, gd: 4, pts: 6 },
        { fifaCode: 'CAN', p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 2, gd: 1, pts: 3 },
        { fifaCode: 'NCL', p: 2, w: 1, d: 0, l: 1, gf: 2, ga: 3, gd: -1, pts: 3 },
        { fifaCode: 'CPV', p: 2, w: 0, d: 0, l: 2, gf: 1, ga: 5, gd: -4, pts: 0 },
      ],
    },
    {
      id: 'B',
      standings: [
        { fifaCode: 'ESP', p: 2, w: 2, d: 0, l: 0, gf: 6, ga: 2, gd: 4, pts: 6 },
        { fifaCode: 'USA', p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 3, gd: 0, pts: 3 },
        { fifaCode: 'MAR', p: 2, w: 1, d: 0, l: 1, gf: 2, ga: 3, gd: -1, pts: 3 },
        { fifaCode: 'UZB', p: 2, w: 0, d: 0, l: 2, gf: 1, ga: 4, gd: -3, pts: 0 },
      ],
    },
  ],
  fixtures: [
    {
      id: 'mock-101',
      utc: '2026-06-18T20:00:00Z',
      group: 'B',
      stage: 'group',
      home: 'ESP',
      away: 'USA',
      homeGoals: 2,
      awayGoals: 1,
      status: 'final',
      minute: null,
      venue: 'AT&T Stadium, Arlington',
      events: [
        { type: 'goal', team: 'ESP', player: 'Lamine Yamal', minute: 14 },
        { type: 'yellow', team: 'USA', player: 'Tyler Adams', minute: 27 },
        { type: 'goal', team: 'USA', player: 'Christian Pulisic', minute: 41 },
        { type: 'goal', team: 'ESP', player: 'Nico Williams', minute: 68 },
        { type: 'red', team: 'USA', player: 'Sergiño Dest', minute: 79 },
      ],
    },
    {
      id: 'mock-102',
      utc: '2026-06-18T18:30:00Z',
      group: 'A',
      stage: 'group',
      home: 'MEX',
      away: 'CAN',
      homeGoals: 3,
      awayGoals: 1,
      status: 'live',
      minute: 67,
      venue: 'Estadio Azteca, Mexico City',
      events: [
        { type: 'goal', team: 'MEX', player: 'Santiago Giménez', minute: 12 },
        { type: 'yellow', team: 'CAN', player: 'Stephen Eustáquio', minute: 33 },
        { type: 'goal', team: 'MEX', player: 'Edson Álvarez', minute: 38 },
        { type: 'goal', team: 'CAN', player: 'Jonathan David', minute: 55 },
        { type: 'goal', team: 'MEX', player: 'Santiago Giménez', minute: 61 },
      ],
    },
    {
      id: 'mock-103',
      utc: '2026-06-19T19:00:00Z',
      group: 'A',
      stage: 'group',
      home: 'NCL',
      away: 'CPV',
      homeGoals: null,
      awayGoals: null,
      status: 'scheduled',
      minute: null,
      venue: 'BMO Field, Toronto',
      events: [],
    },
  ],
  topScorers: [
    { player: 'Santiago Giménez', team: 'MEX', goals: 3 },
    { player: 'Lamine Yamal', team: 'ESP', goals: 2 },
    { player: 'Christian Pulisic', team: 'USA', goals: 2 },
    { player: 'Nico Williams', team: 'ESP', goals: 2 },
    { player: 'Jonathan David', team: 'CAN', goals: 1 },
    { player: 'Edson Álvarez', team: 'MEX', goals: 1 },
  ],
};
