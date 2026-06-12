<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { store } from './lib/state/store.svelte.js';
  import { modal } from './lib/state/modal.svelte.js';
  import { ui } from './lib/state/ui.svelte.js';
  import { celebrations } from './lib/state/celebrations.svelte.js';
  import { rankSnapshot, recapSince, recapHasContent, MIN_GAP_MS, RECAP_WINDOW_MS } from './lib/state/recap.js';
  import { dur } from './lib/motion.js';
  import Header from './components/Header.svelte';
  import BrandTitle from './components/BrandTitle.svelte';
  import BanterBanner from './components/BanterBanner.svelte';
  import GoalFlash from './components/GoalFlash.svelte';
  import ViewTabs from './components/ViewTabs.svelte';
  import Countdown from './components/Countdown.svelte';
  import PoolView from './views/PoolView.svelte';
  import KnockoutView from './views/KnockoutView.svelte';
  import WinnersView from './views/WinnersView.svelte';
  import EmployeeModal from './components/modals/EmployeeModal.svelte';
  import GameModal from './components/modals/GameModal.svelte';
  import TeamModal from './components/modals/TeamModal.svelte';
  import PrizeModal from './components/modals/PrizeModal.svelte';
  import RecapModal from './components/modals/RecapModal.svelte';

  function selectView(id) {
    store.setView(id);
  }

  // ── "While you were sleeping" visit bookkeeping ─────────────────────────────
  // A localStorage marker records when the page was last opened (plus a tiny
  // leaderboard snapshot for rank-movement diffs). On the next open we recap
  // everything since then — capped at 48h, only after a 6h+ absence, only if
  // something actually happened, and only unless the user disabled it.
  const VISIT_KEY = 'synergysweep:last-visit';
  let visitHandled = false;
  $effect(() => {
    // In live mode wait for the first real sync — diffing the mock baseline
    // would produce a recap full of placeholder data.
    const ready = store.mode === 'live' ? !!store.lastSync : true;
    if (visitHandled || !ready) return;
    visitHandled = true;

    let prev = null;
    try {
      prev = JSON.parse(localStorage.getItem(VISIT_KEY) ?? 'null');
    } catch {
      prev = null;
    }
    try {
      localStorage.setItem(
        VISIT_KEY,
        JSON.stringify({ ts: new Date().toISOString(), ranks: rankSnapshot(store.state, store.employees) }),
      );
    } catch {
      // storage unavailable — recaps just won't auto-trigger
    }

    if (ui.recapDisabled || !prev?.ts) return;
    const prevTs = new Date(prev.ts).getTime();
    if (!Number.isFinite(prevTs) || Date.now() - prevTs < MIN_GAP_MS) return;
    const recap = recapSince(store.state, prevTs, store.employees, prev.ranks ?? null);
    if (recapHasContent(recap)) modal.recap(prevTs, prev.ranks ?? null);
  });

  onMount(() => {
    store.start();
    // ?demo=goal — fire a sample celebration so the flash can be shown off
    // (and tested) without waiting for a live goal.
    if (new URLSearchParams(window.location.search).get('demo') === 'goal') {
      const demo = (store.state.fixtures ?? []).find((f) => f.status === 'live') ?? store.state.fixtures?.[0];
      if (demo) {
        setTimeout(() => {
          celebrations.push({
            match: demo,
            team: demo.home,
            count: 1,
            owner: store.employees.find((e) => e.teams.some((t) => t.fifaCode === demo.home)) ?? null,
          });
        }, 800);
      }
    }
  });

  const sourceLabel = $derived.by(() => {
    if (store.mode === 'mock') return 'mock data';
    if (store.mode === 'mock-final') return 'mock (final state)';
    const d = store.diagnostics;
    if (!d) return 'live';
    const ok = [];
    const fail = [];
    const tag = (name, src) => {
      if (src === 'network' || src === 'cache') ok.push(name);
      else if (src === 'none' || src === 'stale') fail.push(name);
    };
    tag('openfootball', d.sources?.baseline);
    tag('ESPN', d.sources?.scoreboard);
    if (!ok.length) return 'no data sources reachable';
    const failNote = fail.length ? ` · ${fail.join(' + ')} unreachable` : '';
    return `${ok.join(' + ')}${failNote}`;
  });

  const syncLabel = $derived.by(() => {
    if (store.syncing) return 'syncing…';
    if (!store.lastSync) return 'no sync yet';
    return `synced ${store.lastSync.toLocaleTimeString('en-IE', { timeZone: 'Europe/Dublin' })}`;
  });
</script>

<div class="min-h-screen flex flex-col">
  <!-- Brand bar -->
  <div class="px-3 sm:px-5 pt-3 flex items-center gap-2.5">
    <span class="bg-volt text-ink type-display text-sm px-2 py-1 rounded-[4px] -skew-x-12 inline-block" aria-hidden="true">
      <span class="inline-block skew-x-12">WC26</span>
    </span>
    <div class="leading-none">
      <BrandTitle />
      <div class="type-kicker text-fg-faint mt-1">FIFA World Cup 2026 · 11 Jun – 19 Jul</div>
    </div>
  </div>

  <Header state={store.state} employees={store.employees} />
  {#if !ui.banterHidden}
    <BanterBanner state={store.state} employees={store.employees} />
  {/if}
  <ViewTabs value={store.view} phase={store.phase} onSelect={selectView} />
  <Countdown snapshot={store.state} />

  <main class="flex-1">
    {#if store.view === 'group'}
      <div in:fade={{ duration: dur(180) }}>
        <PoolView state={store.state} employees={store.employees} />
      </div>
    {:else if store.view === 'knockout'}
      <div in:fade={{ duration: dur(180) }}>
        <KnockoutView state={store.state} employees={store.employees} />
      </div>
    {:else}
      <div in:fade={{ duration: dur(180) }}>
        <WinnersView state={store.state} employees={store.employees} />
      </div>
    {/if}
  </main>

  {#if modal.current?.type === 'employee'}
    <EmployeeModal employeeId={modal.current.params.id} />
  {:else if modal.current?.type === 'team'}
    <TeamModal code={modal.current.params.code} />
  {:else if modal.current?.type === 'game'}
    <GameModal matchId={modal.current.params.matchId} />
  {:else if modal.current?.type === 'prize'}
    <PrizeModal category={modal.current.params.category} />
  {:else if modal.current?.type === 'recap'}
    <RecapModal sinceMs={modal.current.params.sinceMs} prevRanks={modal.current.params.prevRanks} />
  {/if}

  <GoalFlash />

  <footer class="mt-2 px-3 sm:px-5 py-3 border-t border-line/60 text-[11px] type-cond text-fg-faint flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
    <span>SynergySuite World Cup 2026 sweepstake</span>
    <div class="flex items-center gap-3">
      {#if ui.banterHidden}
        <button type="button" class="pressable text-fg-faint hover:text-gold" onclick={() => ui.setBanterHidden(false)}>
          Show Banter Banner
        </button>
      {/if}
      <button
        type="button"
        class="pressable text-fg-faint hover:text-fg"
        aria-label="Show a recap of the last 48 hours"
        title="What happened in the last 2 days"
        onclick={() => modal.recap(Date.now() - RECAP_WINDOW_MS)}
      >📰 recap</button>
      <button
        type="button"
        class="pressable text-fg-faint hover:text-fg"
        aria-label={ui.hornMuted ? 'Unmute goal horn' : 'Mute goal horn'}
        title="Air horn on goal celebrations"
        onclick={() => ui.setHornMuted(!ui.hornMuted)}
      >{ui.hornMuted ? '🔇 horn off' : '🔊 horn on'}</button>
      {#if store.syncing}
        <span class="inline-flex items-center gap-1.5 text-volt">
          <span class="w-1.5 h-1.5 rounded-full bg-volt live-dot"></span>
          syncing…
        </span>
      {/if}
      {#if store.lastError}
        <span class="text-live/90" title={String(store.lastError)}>· using cached data</span>
      {/if}
      <span class="tnum">{sourceLabel} · {syncLabel}</span>
    </div>
  </footer>
</div>
