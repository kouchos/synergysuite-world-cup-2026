<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { store } from './lib/state/store.svelte.js';
  import Header from './components/Header.svelte';
  import ViewTabs from './components/ViewTabs.svelte';
  import Countdown from './components/Countdown.svelte';
  import PoolView from './views/PoolView.svelte';
  import KnockoutView from './views/KnockoutView.svelte';
  import WinnersView from './views/WinnersView.svelte';

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
  <Header state={store.state} employees={store.employees} />
  <ViewTabs value={store.view} phase={store.phase} onSelect={selectView} />
  <Countdown snapshot={store.state} />

  <main class="flex-1">
    {#if store.view === 'group'}
      <div in:fade={{ duration: 180 }}>
        <PoolView state={store.state} employees={store.employees} />
      </div>
    {:else if store.view === 'knockout'}
      <div in:fade={{ duration: 180 }}>
        <KnockoutView state={store.state} employees={store.employees} />
      </div>
    {:else}
      <div in:fade={{ duration: 180 }}>
        <WinnersView state={store.state} employees={store.employees} />
      </div>
    {/if}
  </main>

  <footer class="px-4 py-3 text-xs text-stone-400/70 flex items-center justify-between gap-4">
    <span>SynergySuite World Cup 2026 sweepstake</span>
    <div class="flex items-center gap-3">
      {#if store.syncing}
        <span class="inline-flex items-center gap-1.5 text-emerald-300">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot"></span>
          syncing…
        </span>
      {/if}
      {#if store.lastError}
        <span class="text-rose-300/80" title={String(store.lastError)}>· using cached data</span>
      {/if}
      <span>{sourceLabel} · {syncLabel}</span>
    </div>
  </footer>
</div>
