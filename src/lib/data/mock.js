/**
 * Mid-group-stage snapshot used by ?mock=1 and during dev before live data exists.
 * Shape matches what the (forthcoming) ESPN adapter will produce — see adapter.js.
 *
 * Designed to give all 8 employees something visible across the four prize tiles:
 *   Overall  → Hazel (BRA + MEX banking 6+6 pts)
 *   Worst    → Curaçao (Jeff) — 0 pts, GD −5, GF 0
 *   Cards    → Tom (SWE + AUT racking up yellows + a red = 7 pts)
 *   Golden   → Tim (via Lautaro Martínez, 3 goals)
 *
 * Six groups (half the tournament) so the TV-target xl:grid-cols-3 layout
 * fills out properly in screenshots without writing every match.
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
        { fifaCode: 'COD', p: 2, w: 1, d: 0, l: 1, gf: 2, ga: 3, gd: -1, pts: 3 },
        { fifaCode: 'IRQ', p: 2, w: 0, d: 0, l: 2, gf: 1, ga: 5, gd: -4, pts: 0 },
      ],
    },
    {
      id: 'B',
      standings: [
        { fifaCode: 'ESP', p: 2, w: 2, d: 0, l: 0, gf: 6, ga: 2, gd: 4, pts: 6 },
        { fifaCode: 'USA', p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 3, gd: 0, pts: 3 },
        { fifaCode: 'MAR', p: 2, w: 1, d: 0, l: 1, gf: 2, ga: 3, gd: -1, pts: 3 },
        { fifaCode: 'SWE', p: 2, w: 0, d: 0, l: 2, gf: 1, ga: 4, gd: -3, pts: 0 },
      ],
    },
    {
      id: 'C',
      standings: [
        { fifaCode: 'ARG', p: 2, w: 2, d: 0, l: 0, gf: 5, ga: 1, gd: 4, pts: 6 },
        { fifaCode: 'HAI', p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 3, gd: 0, pts: 3 },
        { fifaCode: 'JPN', p: 2, w: 1, d: 0, l: 1, gf: 2, ga: 2, gd: 0, pts: 3 },
        { fifaCode: 'PAN', p: 2, w: 0, d: 0, l: 2, gf: 1, ga: 5, gd: -4, pts: 0 },
      ],
    },
    {
      id: 'D',
      standings: [
        { fifaCode: 'BRA', p: 2, w: 2, d: 0, l: 0, gf: 4, ga: 0, gd: 4, pts: 6 },
        { fifaCode: 'CRO', p: 2, w: 1, d: 1, l: 0, gf: 3, ga: 2, gd: 1, pts: 4 },
        { fifaCode: 'TUR', p: 2, w: 0, d: 1, l: 1, gf: 2, ga: 3, gd: -1, pts: 1 },
        { fifaCode: 'AUT', p: 2, w: 0, d: 0, l: 2, gf: 1, ga: 5, gd: -4, pts: 0 },
      ],
    },
    {
      id: 'E',
      standings: [
        { fifaCode: 'FRA', p: 2, w: 2, d: 0, l: 0, gf: 6, ga: 1, gd: 5, pts: 6 },
        { fifaCode: 'KOR', p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 2, gd: 1, pts: 3 },
        { fifaCode: 'PAR', p: 2, w: 1, d: 0, l: 1, gf: 2, ga: 3, gd: -1, pts: 3 },
        { fifaCode: 'CZE', p: 2, w: 0, d: 0, l: 2, gf: 1, ga: 5, gd: -4, pts: 0 },
      ],
    },
    {
      id: 'F',
      standings: [
        { fifaCode: 'GER', p: 2, w: 2, d: 0, l: 0, gf: 5, ga: 2, gd: 3, pts: 6 },
        { fifaCode: 'SEN', p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 3, gd: 0, pts: 3 },
        { fifaCode: 'SUI', p: 2, w: 1, d: 0, l: 1, gf: 3, ga: 3, gd: 0, pts: 3 },
        { fifaCode: 'CUW', p: 2, w: 0, d: 0, l: 2, gf: 0, ga: 5, gd: -5, pts: 0 },
      ],
    },
  ],
  fixtures: [
    {
      id: 'mock-mex-irq',
      utc: '2026-06-18T18:30:00Z',
      group: 'A',
      stage: 'group',
      home: 'MEX',
      away: 'IRQ',
      homeGoals: 3,
      awayGoals: 1,
      status: 'live',
      minute: 67,
      venue: 'Estadio Azteca, Mexico City',
      events: [
        { type: 'goal', team: 'MEX', player: 'Santiago Giménez', minute: 12 },
        { type: 'yellow', team: 'IRQ', player: 'Ali Adnan', minute: 33 },
        { type: 'goal', team: 'MEX', player: 'Edson Álvarez', minute: 38 },
        { type: 'goal', team: 'IRQ', player: 'Aymen Hussein', minute: 55 },
        { type: 'yellow', team: 'MEX', player: 'César Montes', minute: 60 },
        { type: 'goal', team: 'MEX', player: 'Santiago Giménez', minute: 61 },
      ],
    },
    {
      id: 'mock-esp-swe',
      utc: '2026-06-17T20:00:00Z',
      group: 'B',
      stage: 'group',
      home: 'ESP',
      away: 'SWE',
      homeGoals: 4,
      awayGoals: 1,
      status: 'final',
      minute: null,
      venue: 'AT&T Stadium, Arlington',
      events: [
        { type: 'goal', team: 'ESP', player: 'Lamine Yamal', minute: 14 },
        { type: 'yellow', team: 'SWE', player: 'Victor Lindelöf', minute: 27 },
        { type: 'goal', team: 'ESP', player: 'Pedri', minute: 38 },
        { type: 'goal', team: 'ESP', player: 'Nico Williams', minute: 55 },
        { type: 'yellow', team: 'SWE', player: 'Alexander Isak', minute: 64 },
        { type: 'goal', team: 'SWE', player: 'Alexander Isak', minute: 71 },
        { type: 'red', team: 'SWE', player: 'Victor Lindelöf', minute: 79 },
        { type: 'goal', team: 'ESP', player: 'Mikel Oyarzabal', minute: 88 },
      ],
    },
    {
      id: 'mock-arg-pan',
      utc: '2026-06-17T22:00:00Z',
      group: 'C',
      stage: 'group',
      home: 'ARG',
      away: 'PAN',
      homeGoals: 3,
      awayGoals: 0,
      status: 'final',
      minute: null,
      venue: 'Hard Rock Stadium, Miami',
      events: [
        { type: 'goal', team: 'ARG', player: 'Lionel Messi', minute: 22 },
        { type: 'goal', team: 'ARG', player: 'Lautaro Martínez', minute: 41 },
        { type: 'yellow', team: 'PAN', player: 'Aníbal Godoy', minute: 50 },
        { type: 'goal', team: 'ARG', player: 'Lautaro Martínez', minute: 73 },
        { type: 'yellow', team: 'PAN', player: 'Cristhian Martínez', minute: 81 },
      ],
    },
    {
      id: 'mock-bra-aut',
      utc: '2026-06-17T18:00:00Z',
      group: 'D',
      stage: 'group',
      home: 'BRA',
      away: 'AUT',
      homeGoals: 2,
      awayGoals: 0,
      status: 'final',
      minute: null,
      venue: 'SoFi Stadium, Los Angeles',
      events: [
        { type: 'goal', team: 'BRA', player: 'Vinícius Jr.', minute: 18 },
        { type: 'yellow', team: 'AUT', player: 'Marcel Sabitzer', minute: 35 },
        { type: 'goal', team: 'BRA', player: 'Rodrygo', minute: 60 },
        { type: 'red', team: 'AUT', player: 'David Alaba', minute: 74 },
      ],
    },
    {
      id: 'mock-fra-cze',
      utc: '2026-06-18T19:30:00Z',
      group: 'E',
      stage: 'group',
      home: 'FRA',
      away: 'CZE',
      homeGoals: 3,
      awayGoals: 0,
      status: 'final',
      minute: null,
      venue: 'Mercedes-Benz Stadium, Atlanta',
      events: [
        { type: 'goal', team: 'FRA', player: 'Kylian Mbappé', minute: 25 },
        { type: 'goal', team: 'FRA', player: 'Aurélien Tchouaméni', minute: 51 },
        { type: 'yellow', team: 'CZE', player: 'Tomáš Souček', minute: 62 },
        { type: 'goal', team: 'FRA', player: 'Kylian Mbappé', minute: 78 },
        { type: 'yellow', team: 'CZE', player: 'Patrik Schick', minute: 85 },
      ],
    },
    {
      id: 'mock-ger-cuw',
      utc: '2026-06-16T20:00:00Z',
      group: 'F',
      stage: 'group',
      home: 'GER',
      away: 'CUW',
      homeGoals: 5,
      awayGoals: 0,
      status: 'final',
      minute: null,
      venue: 'MetLife Stadium, New York',
      events: [
        { type: 'goal', team: 'GER', player: 'Florian Wirtz', minute: 9 },
        { type: 'goal', team: 'GER', player: 'Jamal Musiala', minute: 34 },
        { type: 'yellow', team: 'CUW', player: 'Jürgen Locadia', minute: 48 },
        { type: 'goal', team: 'GER', player: 'Niclas Füllkrug', minute: 60 },
        { type: 'goal', team: 'GER', player: 'Niclas Füllkrug', minute: 71 },
        { type: 'yellow', team: 'CUW', player: 'Leandro Bacuna', minute: 80 },
        { type: 'goal', team: 'GER', player: 'Kai Havertz', minute: 86 },
      ],
    },
    {
      id: 'mock-can-cod',
      utc: '2026-06-19T19:00:00Z',
      group: 'A',
      stage: 'group',
      home: 'CAN',
      away: 'COD',
      homeGoals: null,
      awayGoals: null,
      status: 'scheduled',
      minute: null,
      venue: 'BMO Field, Toronto',
      events: [],
    },
    {
      id: 'mock-usa-mar',
      utc: '2026-06-19T21:00:00Z',
      group: 'B',
      stage: 'group',
      home: 'USA',
      away: 'MAR',
      homeGoals: null,
      awayGoals: null,
      status: 'scheduled',
      minute: null,
      venue: 'Levi’s Stadium, Santa Clara',
      events: [],
    },
    {
      id: 'mock-jpn-hai',
      utc: '2026-06-20T17:00:00Z',
      group: 'C',
      stage: 'group',
      home: 'JPN',
      away: 'HAI',
      homeGoals: null,
      awayGoals: null,
      status: 'scheduled',
      minute: null,
      venue: 'NRG Stadium, Houston',
      events: [],
    },
    {
      id: 'mock-cro-tur',
      utc: '2026-06-20T20:00:00Z',
      group: 'D',
      stage: 'group',
      home: 'CRO',
      away: 'TUR',
      homeGoals: null,
      awayGoals: null,
      status: 'scheduled',
      minute: null,
      venue: 'Lincoln Financial Field, Philadelphia',
      events: [],
    },
  ],
  topScorers: [
    { player: 'Lautaro Martínez', team: 'ARG', goals: 3 },
    { player: 'Santiago Giménez', team: 'MEX', goals: 3 },
    { player: 'Kylian Mbappé', team: 'FRA', goals: 2 },
    { player: 'Niclas Füllkrug', team: 'GER', goals: 2 },
    { player: 'Lamine Yamal', team: 'ESP', goals: 2 },
    { player: 'Nico Williams', team: 'ESP', goals: 1 },
    { player: 'Mikel Oyarzabal', team: 'ESP', goals: 1 },
    { player: 'Vinícius Jr.', team: 'BRA', goals: 1 },
    { player: 'Florian Wirtz', team: 'GER', goals: 1 },
  ],
  // Knockout matches — independent of the group-stage state above; the Knockout
  // view reads from this list. In a real run, ids/slots feed from R32 into R16
  // etc. For the mock we hand-author a mid-R16 moment: R32 done, half of R16
  // played (including one live), QF/SF/F/3rd still TBD.
  knockoutMatches: [
    // ── Round of 32 — all played ───────────────────────────────────────────────
    { id: 'r32-1',  round: 'R32', slot: 1,  utc: '2026-06-29T18:00:00Z', home: 'NED', away: 'IRQ', homeGoals: 3, awayGoals: 0, status: 'final' },
    { id: 'r32-2',  round: 'R32', slot: 2,  utc: '2026-06-29T20:00:00Z', home: 'CRO', away: 'MEX', homeGoals: 1, awayGoals: 2, status: 'final' },
    { id: 'r32-3',  round: 'R32', slot: 3,  utc: '2026-06-29T22:00:00Z', home: 'JPN', away: 'ECU', homeGoals: 1, awayGoals: 0, status: 'final' },
    { id: 'r32-4',  round: 'R32', slot: 4,  utc: '2026-06-30T18:00:00Z', home: 'ENG', away: 'BIH', homeGoals: 2, awayGoals: 0, status: 'final' },
    { id: 'r32-5',  round: 'R32', slot: 5,  utc: '2026-06-30T20:00:00Z', home: 'ESP', away: 'UZB', homeGoals: 4, awayGoals: 1, status: 'final' },
    { id: 'r32-6',  round: 'R32', slot: 6,  utc: '2026-06-30T22:00:00Z', home: 'ARG', away: 'EGY', homeGoals: 2, awayGoals: 1, status: 'final' },
    { id: 'r32-7',  round: 'R32', slot: 7,  utc: '2026-07-01T18:00:00Z', home: 'ALG', away: 'BEL', homeGoals: 1, awayGoals: 3, status: 'final' },
    { id: 'r32-8',  round: 'R32', slot: 8,  utc: '2026-07-01T20:00:00Z', home: 'BRA', away: 'HAI', homeGoals: 4, awayGoals: 0, status: 'final' },
    { id: 'r32-9',  round: 'R32', slot: 9,  utc: '2026-07-01T22:00:00Z', home: 'FRA', away: 'JOR', homeGoals: 3, awayGoals: 0, status: 'final' },
    { id: 'r32-10', round: 'R32', slot: 10, utc: '2026-07-02T18:00:00Z', home: 'POR', away: 'COL', homeGoals: 2, awayGoals: 1, status: 'final' },
    { id: 'r32-11', round: 'R32', slot: 11, utc: '2026-07-02T20:00:00Z', home: 'KOR', away: 'MAR', homeGoals: 1, awayGoals: 0, status: 'final' },
    { id: 'r32-12', round: 'R32', slot: 12, utc: '2026-07-02T22:00:00Z', home: 'USA', away: 'CAN', homeGoals: 2, awayGoals: 1, status: 'final' },
    { id: 'r32-13', round: 'R32', slot: 13, utc: '2026-07-03T18:00:00Z', home: 'GER', away: 'URU', homeGoals: 2, awayGoals: 0, status: 'final' },
    { id: 'r32-14', round: 'R32', slot: 14, utc: '2026-07-03T20:00:00Z', home: 'SEN', away: 'IRN', homeGoals: 1, awayGoals: 0, status: 'final' },
    { id: 'r32-15', round: 'R32', slot: 15, utc: '2026-07-03T22:00:00Z', home: 'NOR', away: 'AUS', homeGoals: 3, awayGoals: 1, status: 'final' },
    { id: 'r32-16', round: 'R32', slot: 16, utc: '2026-07-04T18:00:00Z', home: 'SUI', away: 'GHA', homeGoals: 2, awayGoals: 1, status: 'final' },

    // ── Round of 16 — 4 played, 1 live (the big one), 3 to come ────────────────
    { id: 'r16-1', round: 'R16', slot: 1, utc: '2026-07-05T18:00:00Z', home: 'NED', away: 'MEX', homeGoals: 2, awayGoals: 0, status: 'final' },
    { id: 'r16-2', round: 'R16', slot: 2, utc: '2026-07-05T22:00:00Z', home: 'JPN', away: 'ENG', homeGoals: 1, awayGoals: 2, status: 'final' },
    {
      id: 'r16-3',
      round: 'R16',
      slot: 3,
      utc: '2026-07-06T19:00:00Z',
      home: 'ESP',
      away: 'ARG',
      homeGoals: 1,
      awayGoals: 1,
      status: 'live',
      minute: 67,
      events: [
        { type: 'goal', team: 'ESP', player: 'Lamine Yamal', minute: 21 },
        { type: 'yellow', team: 'ARG', player: 'Rodrigo De Paul', minute: 34 },
        { type: 'goal', team: 'ARG', player: 'Lautaro Martínez', minute: 58 },
        { type: 'yellow', team: 'ESP', player: 'Pedri', minute: 63 },
      ],
    },
    { id: 'r16-4', round: 'R16', slot: 4, utc: '2026-07-06T22:00:00Z', home: 'BEL', away: 'BRA', homeGoals: 0, awayGoals: 2, status: 'final' },
    { id: 'r16-5', round: 'R16', slot: 5, utc: '2026-07-07T18:00:00Z', home: 'FRA', away: 'POR', homeGoals: 3, awayGoals: 1, status: 'final' },
    { id: 'r16-6', round: 'R16', slot: 6, utc: '2026-07-07T22:00:00Z', home: 'KOR', away: 'USA', homeGoals: null, awayGoals: null, status: 'scheduled' },
    { id: 'r16-7', round: 'R16', slot: 7, utc: '2026-07-08T18:00:00Z', home: 'GER', away: 'SEN', homeGoals: null, awayGoals: null, status: 'scheduled' },
    { id: 'r16-8', round: 'R16', slot: 8, utc: '2026-07-08T22:00:00Z', home: 'NOR', away: 'SUI', homeGoals: null, awayGoals: null, status: 'scheduled' },

    // ── Quarter-finals — all TBD ───────────────────────────────────────────────
    { id: 'qf-1', round: 'QF', slot: 1, utc: '2026-07-10T20:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },
    { id: 'qf-2', round: 'QF', slot: 2, utc: '2026-07-10T22:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },
    { id: 'qf-3', round: 'QF', slot: 3, utc: '2026-07-11T20:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },
    { id: 'qf-4', round: 'QF', slot: 4, utc: '2026-07-11T22:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },

    // ── Semi-finals ─────────────────────────────────────────────────────────────
    { id: 'sf-1', round: 'SF', slot: 1, utc: '2026-07-14T20:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },
    { id: 'sf-2', round: 'SF', slot: 2, utc: '2026-07-15T20:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },

    // ── Third place ─────────────────────────────────────────────────────────────
    { id: 'tp-1', round: 'Third', slot: 1, utc: '2026-07-18T20:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },

    // ── Final ───────────────────────────────────────────────────────────────────
    { id: 'final-1', round: 'Final', slot: 1, utc: '2026-07-19T20:00:00Z', home: null, away: null, homeGoals: null, awayGoals: null, status: 'scheduled' },
  ],
};

/**
 * End-of-tournament snapshot for ?mock=final. Used to demo and screenshot the
 * Winners view (and the fully-resolved Pool / Knockout views) before the real
 * final exists. Engineered so all four prize tiles land on different employees:
 *   Champion → Niall (France lift the cup, beating Argentina 2-1)
 *   Worst    → Jeff   (Curaçao still the cellar dwellers from groups)
 *   Cards    → Tom    (extended his group-stage lead through to bronze)
 *   Golden   → Tim    (Lautaro Martínez 7 — silver but still top scorer)
 */
export const MOCK_STATE_FINAL = {
  ...MOCK_STATE,
  phase: 'winners',
  lastUpdated: new Date('2026-07-19T22:30:00+01:00').toISOString(),
  // All group fixtures are over by the time the tournament ends — clamp any
  // live/scheduled ones to final so the countdown / live banner stay quiet.
  fixtures: MOCK_STATE.fixtures.map((f) => ({ ...f, status: 'final', minute: null })),
  // Group standings remain as they were at end of group stage — no further changes.
  // The big difference is the bracket is now fully resolved.
  knockoutMatches: [
    // R32 — unchanged from the mid-tournament mock
    ...MOCK_STATE.knockoutMatches.filter((m) => m.round === 'R32'),

    // R16 — finish off the 3 that were live/scheduled mid-tournament
    { id: 'r16-1', round: 'R16', slot: 1, utc: '2026-07-05T18:00:00Z', home: 'NED', away: 'MEX', homeGoals: 2, awayGoals: 0, status: 'final' },
    { id: 'r16-2', round: 'R16', slot: 2, utc: '2026-07-05T22:00:00Z', home: 'JPN', away: 'ENG', homeGoals: 1, awayGoals: 2, status: 'final' },
    { id: 'r16-3', round: 'R16', slot: 3, utc: '2026-07-06T19:00:00Z', home: 'ESP', away: 'ARG', homeGoals: 2, awayGoals: 3, status: 'final' },
    { id: 'r16-4', round: 'R16', slot: 4, utc: '2026-07-06T22:00:00Z', home: 'BEL', away: 'BRA', homeGoals: 0, awayGoals: 2, status: 'final' },
    { id: 'r16-5', round: 'R16', slot: 5, utc: '2026-07-07T18:00:00Z', home: 'FRA', away: 'POR', homeGoals: 3, awayGoals: 1, status: 'final' },
    { id: 'r16-6', round: 'R16', slot: 6, utc: '2026-07-07T22:00:00Z', home: 'KOR', away: 'USA', homeGoals: 1, awayGoals: 3, status: 'final' },
    { id: 'r16-7', round: 'R16', slot: 7, utc: '2026-07-08T18:00:00Z', home: 'GER', away: 'SEN', homeGoals: 2, awayGoals: 1, status: 'final' },
    { id: 'r16-8', round: 'R16', slot: 8, utc: '2026-07-08T22:00:00Z', home: 'NOR', away: 'SUI', homeGoals: 0, awayGoals: 1, status: 'final' },

    // QF
    { id: 'qf-1', round: 'QF', slot: 1, utc: '2026-07-10T20:00:00Z', home: 'NED', away: 'ENG', homeGoals: 2, awayGoals: 1, status: 'final' },
    { id: 'qf-2', round: 'QF', slot: 2, utc: '2026-07-10T22:00:00Z', home: 'ARG', away: 'BRA', homeGoals: 2, awayGoals: 0, status: 'final' },
    { id: 'qf-3', round: 'QF', slot: 3, utc: '2026-07-11T20:00:00Z', home: 'FRA', away: 'USA', homeGoals: 2, awayGoals: 0, status: 'final' },
    { id: 'qf-4', round: 'QF', slot: 4, utc: '2026-07-11T22:00:00Z', home: 'GER', away: 'SUI', homeGoals: 1, awayGoals: 2, status: 'final' },

    // SF
    { id: 'sf-1', round: 'SF', slot: 1, utc: '2026-07-14T20:00:00Z', home: 'NED', away: 'ARG', homeGoals: 0, awayGoals: 1, status: 'final' },
    { id: 'sf-2', round: 'SF', slot: 2, utc: '2026-07-15T20:00:00Z', home: 'FRA', away: 'SUI', homeGoals: 3, awayGoals: 0, status: 'final' },

    // Third place
    { id: 'tp-1', round: 'Third', slot: 1, utc: '2026-07-18T20:00:00Z', home: 'NED', away: 'SUI', homeGoals: 2, awayGoals: 1, status: 'final' },

    // Final 🏆
    { id: 'final-1', round: 'Final', slot: 1, utc: '2026-07-19T20:00:00Z', home: 'FRA', away: 'ARG', homeGoals: 2, awayGoals: 1, status: 'final' },
  ],
  // Tournament-wide top scorers as they would settle at the end.
  topScorers: [
    { player: 'Lautaro Martínez', team: 'ARG', goals: 7 },
    { player: 'Kylian Mbappé', team: 'FRA', goals: 6 },
    { player: 'Santiago Giménez', team: 'MEX', goals: 5 },
    { player: 'Lamine Yamal', team: 'ESP', goals: 4 },
    { player: 'Vinícius Jr.', team: 'BRA', goals: 4 },
    { player: 'Florian Wirtz', team: 'GER', goals: 3 },
    { player: 'Niclas Füllkrug', team: 'GER', goals: 3 },
    { player: 'Lionel Messi', team: 'ARG', goals: 3 },
  ],
};
