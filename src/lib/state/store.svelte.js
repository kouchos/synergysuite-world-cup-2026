import employeesConfig from '../../../config/employees.json';
import { MOCK_STATE, MOCK_STATE_FINAL } from '../data/mock.js';
import { fetchLiveState, backfillEvents } from '../data/adapter.js';
import { purge as purgeCache } from '../cache.js';
import { celebrations } from './celebrations.svelte.js';
import { detectActivity, intervalFor } from './activity.js';

const employees = employeesConfig.employees;

// ── Mode selection ───────────────────────────────────────────────────────────
// Default is live data. ?mock=1 forces mid-tournament mock; ?mock=final forces
// post-tournament mock. VITE_MOCK=1 at build time flips dev to mock by default.
function modeFromUrl() {
  if (typeof window === 'undefined') return import.meta.env.VITE_MOCK === '1' ? 'mock' : 'live';
  const params = new URLSearchParams(window.location.search);
  // ?nocache=1 — clear localStorage cache on load so the next fetch goes to
  // the network. Useful for verifying live data is actually flowing through.
  if (params.get('nocache') === '1') purgeCache();
  const flag = params.get('mock');
  if (flag === 'final' || flag === 'end' || flag === 'winners') return 'mock-final';
  if (flag === '1' || flag === 'true' || flag === 'mid') return 'mock';
  return import.meta.env.VITE_MOCK === '1' ? 'mock' : 'live';
}

function initialSnapshot(mode) {
  if (mode === 'mock-final') return MOCK_STATE_FINAL;
  if (mode === 'mock') return MOCK_STATE;
  // For live mode we render the schedule baseline mock until the first real
  // fetch completes — avoids a blank page during initial paint.
  return MOCK_STATE;
}

// ── Refresh cadence ──────────────────────────────────────────────────────────
// One central tick decides whether a refresh is needed. The adapter caches
// per-endpoint internally, so calling refresh more often than TTL is cheap.
const TICK_MS = 30 * 1000;

// A goal flash is only "live" if the snapshot we're diffing against is recent.
// During play we poll every 60s, so consecutive snapshots are ~a minute apart.
// When the app is resumed after being backgrounded (PWA/tab suspend) or after a
// long idle gap, the in-memory snapshot can be hours old — diffing it would
// flash every goal scored in the meantime as if it just happened. Beyond this
// window we silently rebaseline instead of celebrating.
const MAX_CELEBRATION_GAP_MS = 2 * 60 * 1000;

// detectActivity/intervalFor live in ./activity.js — a plain (rune-free)
// module so they can be unit-tested directly in Node (see
// tests/activity.spec.js) without a Svelte compile step.

function createStore() {
  const mode = modeFromUrl();
  let snapshot = $state(initialSnapshot(mode));
  let activeView = $state(null);
  let lastSync = $state(mode === 'live' ? null : new Date());
  let syncing = $state(false);
  let lastError = $state(null);
  let diagnostics = $state(null);
  let nextRefresh = $state(null);
  let timerId = null;
  // Whether the *previously applied* snapshot's scoreboard data was fresh
  // (network or cache) rather than a stale outage fallback (see tick() for
  // the full explanation). Starts false so the very first live tick — which
  // would otherwise diff against the mock baseline — never celebrates.
  let prevFresh = false;
  // Plain (non-reactive) generation counter guarding the fire-and-forget
  // event backfill in tick() — see the comment there.
  let gen = 0;

  const phase = $derived(snapshot?.phase ?? 'group');
  const view = $derived(activeView ?? phase);
  const activity = $derived(detectActivity(snapshot));
  // Whether ESPN data flowed through on the latest sync. Mock modes always
  // count as "available" (they have full data); for live mode we ask the
  // adapter's diagnostics whether scoreboard came from network or cache.
  const espnReachable = $derived.by(() => {
    if (mode !== 'live') return true;
    const src = diagnostics?.sources?.scoreboard;
    return src === 'network' || src === 'cache';
  });

  async function tick() {
    if (mode !== 'live') return;
    if (syncing) return; // resume events can race the scheduled timer
    syncing = true;
    try {
      const next = await fetchLiveState({ live: activity === 'live' });
      // `swr` (cache.js) never throws — during an outage it silently returns
      // stale cached data with source 'stale', so a failed-to-reach-ESPN tick
      // still looks like a "successful" fetch from here. Diffing a fresh
      // post-outage snapshot against an hours-old stale one (or vice versa)
      // would flash every goal scored during the outage all at once. So we
      // only diff when BOTH the previously applied snapshot and this one are
      // fresh (network or cache, not stale-fallback) — same predicate as the
      // `espnReachable` derived below.
      const fresh =
        next._diagnostics?.sources?.scoreboard === 'network' ||
        next._diagnostics?.sources?.scoreboard === 'cache';
      // This subsumes the old "don't diff against the mock baseline" guard:
      // prevFresh starts false, so the first live tick never celebrates
      // either. On top of that, the MAX_CELEBRATION_GAP_MS/lastSync-age guard
      // still applies — it covers tab-suspend, where no ticks ran at all
      // (stale or otherwise) so even a fresh→fresh diff would be comparing
      // against an hours-old baseline.
      const snapshotAge = lastSync ? Date.now() - lastSync.getTime() : Infinity;
      if (prevFresh && fresh && snapshotAge <= MAX_CELEBRATION_GAP_MS) {
        celebrations.fromSnapshots(snapshot, next, employees);
      }
      prevFresh = fresh;
      snapshot = next;
      // Guards the fire-and-forget backfill below: it fetches per-match
      // summaries sequentially and can resolve after a *later* tick has
      // already landed a newer snapshot. Applying a stale backfill result
      // then would visibly revert the score (and could re-fire a
      // celebration next tick). Note: `$state` deep-proxies assigned
      // objects in Svelte 5, so reading `snapshot` back afterwards returns a
      // proxy — comparing it by identity against the raw `next` would always
      // be false. A plain generation counter sidesteps that entirely.
      const myGen = ++gen;
      lastSync = new Date();
      lastError = null;
      diagnostics = next._diagnostics ?? null;
      // Fire-and-forget event backfill so initial paint isn't blocked
      backfillEvents(next).then((withEvents) => {
        if (gen === myGen && withEvents !== next) snapshot = withEvents;
      }).catch(() => {});
    } catch (e) {
      lastError = e;
    } finally {
      syncing = false;
      schedule();
    }
  }

  function schedule() {
    if (timerId) clearTimeout(timerId);
    if (mode !== 'live') return;
    const wait = intervalFor(activity);
    nextRefresh = new Date(Date.now() + wait);
    timerId = setTimeout(tick, wait);
  }

  // Installed PWAs (and background tabs) get *resumed*, not reloaded: their
  // timers are throttled or suspended while hidden, so without this the app
  // shows the last snapshot until a long-overdue timeout finally fires. On
  // becoming visible / focused / back online, refresh immediately — unless a
  // sync just happened, where rescheduling the timer is enough.
  function resumeRefresh() {
    if (mode !== 'live') return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (syncing) return;
    if (lastSync && Date.now() - lastSync.getTime() < 20 * 1000) {
      schedule();
      return;
    }
    tick();
  }

  function start() {
    if (mode !== 'live') return;
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', resumeRefresh);
      window.addEventListener('focus', resumeRefresh);
      window.addEventListener('online', resumeRefresh);
    }
    tick();
  }

  return {
    get state() { return snapshot; },
    get employees() { return employees; },
    get phase() { return phase; },
    get view() { return view; },
    get lastSync() { return lastSync; },
    get syncing() { return syncing; },
    get lastError() { return lastError; },
    get mode() { return mode; },
    get activity() { return activity; },
    get diagnostics() { return diagnostics; },
    get nextRefresh() { return nextRefresh; },
    get espnReachable() { return espnReachable; },
    setView(v) { activeView = v; },
    refresh: tick,
    start,
  };
}

export const store = createStore();
