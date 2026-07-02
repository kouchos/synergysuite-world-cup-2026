/**
 * Activity classification for the live-refresh cadence. Deliberately a plain
 * module (no `$state`/runes) — the store re-exports these, but keeping them
 * rune-free lets this file import cleanly into pure-Node Playwright specs
 * without spinning up a browser or a Svelte compile step.
 */

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Classify how "hot" the tournament is right now, which drives how often the
 * store polls (see intervalFor). `now` is injectable for testability; the
 * store itself always calls this with no second argument (defaults to the
 * real clock).
 */
export function detectActivity(state, now = Date.now()) {
  if (!state) return 'idle';
  const all = [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])];

  // A match actually in progress always wins, regardless of the matchday
  // window below (extra time/penalties can run well past the window, and a
  // delayed kickoff can start slightly outside it).
  const live = all.some((m) => m.status === 'live');
  if (live) return 'live';

  // Matchday window: World Cup kickoffs run roughly 16:00–03:00 UTC, i.e. the
  // schedule regularly spills past midnight UTC. A naive "is this fixture's
  // UTC date-string equal to today's date-string" check misses a late kickoff
  // when `now` is still on the previous UTC day, and wrongly matches a
  // kickoff that already passed midnight from `now`'s point of view — that's
  // exactly the bug this module fixes. Instead we use a rolling window
  // anchored on `now`:
  //   - up to 4h in the past, to cover a match that kicked off recently and
  //     could still be running long (nominal 90 minutes + stoppage + extra
  //     time + penalties can stretch a knockout game out that far) even if
  //     its status hasn't flipped to 'live' yet in our data;
  //   - up to 12h in the future, so the day's last kickoff shows up as
  //     "matchday" (5-minute polling) well before it actually starts, rather
  //     than sitting in the 30-minute idle cadence until the last moment.
  // `status === 'live'` above already handles matches genuinely in play, so
  // this window only needs to catch matches that are about to start or have
  // just finished without the status having caught up.
  const matchday = all.some((m) => {
    if (m.status === 'final') return false;
    const t = Date.parse(m.utc);
    if (!Number.isFinite(t)) return false;
    return t > now - FOUR_HOURS_MS && t < now + TWELVE_HOURS_MS;
  });
  return matchday ? 'matchday' : 'idle';
}

/** Poll cadence for each activity level. */
export function intervalFor(activity) {
  if (activity === 'live') return 60 * 1000;         // tight during play
  if (activity === 'matchday') return 5 * 60 * 1000; // tournament day, no match running
  return 30 * 60 * 1000;                             // quiet
}
