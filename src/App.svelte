<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { store } from './lib/state/store.svelte.js';
  import { modal } from './lib/state/modal.svelte.js';
  import { dur } from './lib/motion.js';
  import Header from './components/Header.svelte';
  import ViewTabs from './components/ViewTabs.svelte';
  import Countdown from './components/Countdown.svelte';
  import PoolView from './views/PoolView.svelte';
  import KnockoutView from './views/KnockoutView.svelte';
  import WinnersView from './views/WinnersView.svelte';
  import EmployeeModal from './components/modals/EmployeeModal.svelte';
  import GameModal from './components/modals/GameModal.svelte';
  import TeamModal from './components/modals/TeamModal.svelte';

  function selectView(id) {
    store.setView(id);
  }

  onMount(() => {
    store.start();
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
      <div class="type-display text-[15px] leading-none">SynergySuite Sweepstake</div>
      <div class="type-kicker text-fg-faint mt-1">FIFA World Cup 2026 · 11 Jun – 19 Jul</div>
    </div>
  </div>

  <Header state={store.state} employees={store.employees} />
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
  {/if}

  <footer class="mt-2 px-3 sm:px-5 py-3 border-t border-line/60 text-[11px] type-cond text-fg-faint flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
    <span>SynergySuite World Cup 2026 sweepstake</span>
    <div class="flex items-center gap-3">
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
