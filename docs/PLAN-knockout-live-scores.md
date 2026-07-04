# Fix plan: Canada v Morocco (R16, 4 July) showed no live scores or progress

**Status:** root cause confirmed by reproduction · fix not yet implemented
**Incident:** the office TV app showed the Round-of-16 tie Canada v Morocco
(match 90, kicked off 4 July 2026, 12:00 UTC−5, finished 0–3) as
`scheduled`, with no live score, no minute, no events — while the footer
reported a healthy `openfootball + ESPN · synced` state.

This document is the implementation plan. Each task below is scoped so an
agent can pick it up independently; tasks 1–3 are the fix, tasks 4–6 are
hardening, observability, and rollout. Task order matters only where noted.

---

## 1. Root cause (confirmed)

Live knockout data reaches the bracket through one narrow gate.
`fetchLiveState()` in `src/lib/data/adapter.js` overlays ESPN scoreboard
events onto the openfootball baseline via `mergeKnockouts()`, which joins on
the key `round|teamA|teamB` (unordered pair of FIFA codes,
`knockoutPairKey()`). Three properties of the surrounding code make that
join brittle, and **any one of them silently blanks a match**:

1. **Unlabeled knockout events default to the wrong round.**
   `partitionEvents()` does `const r = round ?? 'R32'` when
   `roundFromNotes()` finds no recognisable round label in
   `competitions[0].notes[0]` / `season.type.name` / `event.name`. During
   the Round of 32 (28 June – 3 July) that default is *accidentally
   correct*, so everything worked all week. On the first R16 day — 4 July —
   an unlabeled Canada v Morocco event keys as `R32|CAN|MAR`, which matches
   no baseline cell.

2. **Unmatched ESPN events are silently dropped.** `mergeKnockouts()` only
   appends an unmatched ESPN event when the baseline has *no* structure for
   that round (`baselineRoundCounts[e.round]` falsy). openfootball always
   provides full structure for every round, so a mis-keyed event is
   discarded. No error, no diagnostic — `_diagnostics.errors` stays empty
   and the footer says "synced".

3. **There is no team-code alias map.** `teamCodeFromCompetitor()` returns
   ESPN's `team.abbreviation` verbatim. The README documents that ESPN
   abbreviations sometimes diverge from FIFA codes (`SAU`≠`KSA`, `IRI`≠`IRN`
   — and `MOR`≠`MAR` is a known ESPN pattern for Morocco), and prescribes an
   alias map in `adapter.js`, but **that map was never implemented**. A
   `MOR` event produces pair key `R16|CAN|MOR` → no match → dropped (case 2).

**Reproduction** (`scripts/repro-knockout-merge.mjs`, runs the real
`fetchLiveState()` in Node against the real openfootball 2026 JSON with a
stubbed ESPN payload for the live CAN–MAR event):

| Scenario | Result on bracket cell (match 90) |
| --- | --- |
| A. notes say `Round of 16` | ✅ `live 0–2, 63'` — merge works |
| B. notes missing/empty | ❌ stays `scheduled`, event dropped, zero errors |
| C. notes say `Knockout Stage` | ❌ same as B |
| D. notes correct, Morocco = `MOR` | ❌ same as B |

We cannot see which of B/C/D fired today (ESPN is unreachable from this
sandbox), but all three are the same class of defect and all three must be
closed. Two compounding failures made the incident worse:

- **The openfootball fallback carries results the app throws away.**
  openfootball's 2026 JSON now publishes `score` (`ft`/`et`/`p`) and
  `goals1`/`goals2` per match, but `src/lib/data/openfootball.js` hardcodes
  every baseline fixture to `status: 'scheduled'`, goals `null`. So when the
  ESPN overlay fails there is no second chance — not even the full-time
  result ever appears.
- **Silent failure by design.** `swr()` never throws, unmatched events
  aren't counted anywhere, and `phase` detection quietly degrades. Nothing
  told anyone that a played match was invisible.

Knock-on symptom worth knowing: while every knockout merge fails,
`detectPhase()` sees no live/final knockout match, and prize/bracket
progression (`resolveBracketProgression`) stalls — so "progress" freezes
too, exactly as reported.

**Urgency:** if the trigger was B or C, *every remaining knockout match*
(R16 through the Final on 19 July) is affected. If D, every remaining
Morocco match is. Tasks 1–3 should land before the next kickoff.

---

## 2. Implementation tasks

### Task 1 — Make knockout round detection robust (`src/lib/data/adapter.js`)

1. `roundFromNotes()`: scan **all** entries in `competitions[0].notes`
   (headline *and* text), not just `notes[0]`; keep the existing
   `season.type.name` / `event.name` sources.
2. Add a date-window round inference used when notes yield nothing, based on
   the fixed FIFA 2026 calendar (UTC kickoff dates):
   - R32: 28 June – 3 July · R16: 4 – 7 July · QF: 9 – 11 July
   - SF: 14 – 15 July · Third: 18 July · Final: 19 July
   Use half-open windows with ±1 day tolerance at boundaries only where
   rounds don't collide. Export it (e.g. `roundFromDate(utc)`).
3. Replace `const r = round ?? 'R32'` in `partitionEvents()` with
   `round ?? roundFromDate(event.date) ?? 'R32'`.
4. Extend `KNOCKOUT_PATTERNS` conservatively (e.g. `1/8`, `16th-finals`
   style labels) — keep `Final` last so `Semi-final`/`Quarterfinal` can't
   mis-bin.

**Accept when:** repro scenarios B and C land the live score on match 90
(the repro script prints `status: 'live', score: '0-2'` for the cell), and
existing tests pass.

### Task 2 — Team-code alias map + tolerant knockout join (`src/lib/data/adapter.js`)

1. Add an `ESPN_CODE_ALIASES` map at the top of the file and apply it inside
   `teamCodeFromCompetitor()` (and therefore everywhere competitor codes are
   read, including standings normalisation — check
   `normaliseStandings()`/`extractTeamRefs()` use the same translation).
   Seed it with the documented/known divergences relevant to the 48
   qualified teams (see `NAME_TO_CODE` in `openfootball.js` for the
   canonical set): `MOR→MAR`, `SAU→KSA`, `IRI→IRN`, `POR`↔? — verify each
   against a real payload where possible; keep entries commented with why.
2. Add a diagnostic: any competitor abbreviation (post-alias) that is not a
   key of `TEAMS` (`src/lib/data/teams.js`) gets counted into the new
   diagnostics channel (Task 4) as `unknownCodes`.
3. Make `mergeKnockouts()` degrade gracefully instead of dropping:
   - **Join 1 (existing):** `round|pair`.
   - **Join 2 (new):** pair-only across all rounds — a pairing of two real
     teams is unique across a knockout tournament, so if the pair matches a
     baseline cell in a *different* round, trust the baseline's
     round/slot/num and overlay ESPN's live fields (this alone would have
     saved today's match under scenario B/C even without Task 1).
   - **Join 3 (new, conservative):** same UTC calendar day + same inferred
     round + exactly one baseline cell that day still unmatched and with
     unresolved placeholder teams → overlay there. Skip if ambiguous.
   - Anything still unmatched: **do not append silently and do not drop
     silently** — record it in diagnostics (`droppedKnockoutEvents`), keep
     the existing "append only when baseline has no structure" behaviour.
4. Guard `Object.assign(existing, e, …)` in both `mergeKnockouts()` and
   `mergeFixtures()` so an ESPN event with `status: 'scheduled'`/null goals
   can never clobber a baseline (or previously merged) entry that already
   has a result. Simplest rule: only overlay score/status/minute/events
   fields when the incoming status is not `scheduled`, or when the target
   has no result yet.

**Accept when:** repro scenario D lands the live score; a new repro
scenario "wrong round label + MOR" also lands it via Join 2; no test
regressions.

### Task 3 — Use openfootball results as a real fallback (`src/lib/data/openfootball.js`)

1. Parse per-match result data the feed already carries:
   - `score.et ?? score.ft` → `homeGoals`/`awayGoals` (extra-time total is
     the final score; `ft` alone otherwise).
   - `score.p` → `homeShootout`/`awayShootout`.
   - any score present → `status: 'final'` (openfootball only publishes
     scores after full time; it has no live/minute concept).
   - `goals1`/`goals2` → `events` array of `{ type: 'goal', team, player,
     minute }` (team = the corresponding side's FIFA code; parseInt the
     minute — entries look like `{ name, minute }`).
2. Cards are **not** in openfootball — leave events limited to goals; the
   most-cards prize continues to rely on ESPN summaries (unchanged).
3. Merge semantics (interacts with Task 2.4): ESPN wins whenever it has
   real data; openfootball's final result fills in whenever ESPN's entry is
   missing or still `scheduled`. Verify `topScorersFrom()` and the prize
   derivations behave with goal events that have no card events.
4. Consider dropping the openfootball TTL from 6 h to ~1 h during the
   tournament window so post-match results arrive same-day.

**Accept when:** with ESPN fetch stubbed to fail entirely, the merged state
still shows Canada v Morocco as `final 0–3` with Morocco's goalscorers, the
bracket progresses (`resolveBracketProgression` fills the QF slot from the
result), and phase detection reports `knockout`.

### Task 4 — Observability: dropped events must be visible (`adapter.js`, footer component)

1. Extend `_diagnostics` with `{ droppedKnockoutEvents: [{ id, name, round,
   home, away, reason }], unknownCodes: [...] }` populated by Tasks 1–2.
2. Footer (find the component rendering `store.diagnostics` — the source
   label described in README "Footer diagnostics"): when either list is
   non-empty, append a red warning (e.g. `· 1 match not matched`) so a
   silent-drop regression is visible on the TV within one poll cycle.
3. `console.warn` the same payload once per tick (not per render).

**Accept when:** running repro scenario B *without* Tasks 1–2 applied shows
the diagnostic; with them applied, the lists are empty.

### Task 5 — Tests (`tests/`, new fixture-driven unit specs)

1. Port `scripts/repro-knockout-merge.mjs` into a proper spec (pattern
   matches `tests/activity.spec.js` — plain Node, stub `globalThis.fetch`,
   import `fetchLiveState` fresh per scenario via a query-string cache-bust
   or module reset). Commit a **frozen copy** of openfootball's 2026 JSON
   under `tests/fixtures/openfootball-2026-07-04.json` so the spec can't
   drift as the live file updates.
2. Scenarios that must pass: A–D from the repro, wrong-label+wrong-code
   combined, ESPN fully down (Task 3 fallback), ESPN `scheduled` event not
   clobbering an openfootball final (Task 2.4), unknown abbreviation
   surfacing in diagnostics (Task 4).
3. Add one `tests/network.spec.js` case (auto-skip offline, like the
   existing ESPN probes): for every openfootball match with a published
   `score`, the merged state's corresponding entry must not be
   `scheduled`. This is the live tripwire that would have caught today's
   incident on any laptop run.
4. Run: `npm run test:smoke` must stay green; new unit specs run with the
   suite; `npm test` where network is available.

### Task 6 — Rollout & TV self-healing

1. **PWA update check:** the TV never navigates, and `src/main.js` calls
   `registerSW({ immediate: true })` with no periodic re-check, so a
   deployed fix may never reach the always-on screen. Use the
   `onRegisteredSW(url, registration)` callback to `setInterval(() =>
   registration?.update(), 60 * 60 * 1000)` (vite-plugin-pwa `autoUpdate`
   then reloads on activation).
2. Deploy = merge to `main` (Pages workflow auto-deploys). After deploy,
   one manual reload of the TV is required this time (because of item 1
   being part of the same fix).
3. Post-deploy verification on the next matchday (R16 continues 5–7 July,
   e.g. Brazil v Norway 5 July): live score visible within one poll cycle
   of kickoff; footer shows no drop warning; `?nocache=1` reload as a
   clean-slate check.
4. Nice-to-have (separate PR): capture one real ESPN knockout scoreboard
   payload from a network-capable machine into `tests/fixtures/` and
   reconcile `ESPN_CODE_ALIASES` + `KNOCKOUT_PATTERNS` against reality;
   the sandbox agents cannot reach `site.api.espn.com` (proxy 403), so this
   needs either a human or an environment with ESPN egress.

---

## 3. Sequencing & ownership

- **Agent 1:** Task 1 + Task 2 (same file, tightly coupled) → then Task 4
  (small, builds on the join changes).
- **Agent 2 (parallel):** Task 3 (separate file; only the merge-guard rule
  2.4 overlaps — coordinate on that one function or land after Agent 1).
- **Agent 3 (after 1–3):** Task 5 tests, then Task 6.1 PWA change.
- Keep each task a focused commit; the repro script must pass at every
  step it claims to fix.

## 4. Constraints for implementing agents

- `site.api.espn.com` is **blocked** from the sandbox (proxy CONNECT 403).
  Do not "verify" against live ESPN from here; use the stub/fixture
  pattern. `raw.githubusercontent.com` (openfootball) is reachable.
- `src/lib/data/adapter.js` is deliberately the only file that knows ESPN
  field names — keep it that way.
- The views/store consume the internal `State` shape only; none of these
  fixes should touch a `.svelte` file except the footer diagnostic (Task 4)
  and `main.js` (Task 6.1).
- Don't break the mock modes (`?mock=1`, `?mock=final`) — smoke tests cover
  them.
