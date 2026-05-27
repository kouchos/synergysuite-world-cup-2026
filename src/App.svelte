<script>
  import { store } from './lib/state/store.svelte.js';
  import Header from './components/Header.svelte';
  import ViewTabs from './components/ViewTabs.svelte';
  import PoolView from './views/PoolView.svelte';
  import KnockoutView from './views/KnockoutView.svelte';
  import WinnersView from './views/WinnersView.svelte';

  function selectView(id) {
    store.setView(id);
  }
</script>

<div class="min-h-screen flex flex-col">
  <Header state={store.state} employees={store.employees} />
  <ViewTabs value={store.view} phase={store.phase} onSelect={selectView} />

  <main class="flex-1">
    {#if store.view === 'group'}
      <PoolView state={store.state} employees={store.employees} />
    {:else if store.view === 'knockout'}
      <KnockoutView state={store.state} employees={store.employees} />
    {:else}
      <WinnersView state={store.state} employees={store.employees} />
    {/if}
  </main>

  <footer class="px-4 py-3 text-xs text-stone-400/70 flex items-center justify-between">
    <span>SynergySuite World Cup 2026 sweepstake</span>
    <span>
      Last sync: {store.lastSync?.toLocaleTimeString('en-IE', { timeZone: 'Europe/Dublin' })}
      &middot; mock data
    </span>
  </footer>
</div>
