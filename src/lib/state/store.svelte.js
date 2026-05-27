import employeesConfig from '../../../config/employees.json';
import { MOCK_STATE, MOCK_STATE_FINAL } from '../data/mock.js';
import { fetchLiveState, backfillEvents } from '../data/adapter.js';
import { purge as purgeCache } from '../cache.js';

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

function detectActivity(state) {
  if (!state) return 'idle';
  const live =
    state.fixtures?.some((f) => f.status === 'live') ||
    state.knockoutMatches?.some((m) => m.status === 'live');
  if (live) return 'live';
  // Within match window of any fixture happening today?
  const today = new Date().toISOString().slice(0, 10);
  const todayMatch = state.fixtures?.some((f) => f.utc?.startsWith(today));
  return todayMatch ? 'matchday' : 'idle';
}

function intervalFor(activity) {
  if (activity === 'live') return 60 * 1000;       // tight during play
  if (activity === 'matchday') return 5 * 60 * 1000; // tournament day, no match running
  return 30 * 60 * 1000;                            // quiet
}

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

  const phase = $derived(snapshot?.phase ?? 'group');
  const view = $derived(activeView ?? phase);
  const activity = $derived(detectActivity(snapshot));

  async function tick() {
    if (mode !== 'live') return;
    syncing = true;
    try {
      const next = await fetchLiveState();
      snapshot = next;
      lastSync = new Date();
      lastError = null;
      diagnostics = next._diagnostics ?? null;
      // Fire-and-forget event backfill so initial paint isn't blocked
      backfillEvents(next).then((withEvents) => {
        if (withEvents !== next) snapshot = withEvents;
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

  function start() {
    if (mode === 'live') tick();
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
    setView(v) { activeView = v; },
    refresh: tick,
    start,
  };
}

export const store = createStore();
