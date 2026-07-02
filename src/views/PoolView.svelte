<script>
  import GroupTable from '../components/GroupTable.svelte';
  import MatchCard from '../components/MatchCard.svelte';

  let { state, employees, onShowFixtures } = $props();

  const groups = $derived(state.groups ?? []);

  // Upcoming/recent games live on the Fixtures tab now — the pool view only
  // keeps a rail for matches that are in play this second.
  const live = $derived((state.fixtures ?? []).filter((f) => f.status === 'live'));
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-3 px-3 sm:px-5 py-3">
  {#if live.length}
    <!-- Live rail leads on mobile, sits right of the groups on desktop. -->
    <aside class="space-y-4 order-first lg:order-last">
      <section class="rise-in">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h2 class="type-kicker text-live kicker-slash">Live now</h2>
          {#if onShowFixtures}
            <button
              type="button"
              class="type-kicker text-fg-faint hover:text-fg pressable"
              aria-label="Open the Fixtures view"
              onclick={onShowFixtures}
            >all fixtures ›</button>
          {/if}
        </div>
        <div class="space-y-2">
          {#each live as m (m.id)}
            <MatchCard match={m} {employees} />
          {/each}
        </div>
      </section>
    </aside>
  {/if}

  <div
    class="{live.length ? 'lg:col-span-2 xl:grid-cols-3' : 'lg:col-span-3 xl:grid-cols-4'}
      grid grid-cols-1 md:grid-cols-2 gap-2.5 content-start"
  >
    {#each groups as g, i (g.id)}
      <div class="rise-in" style:--stagger={`${Math.min(i * 35, 280)}ms`}>
        <GroupTable group={g} {employees} />
      </div>
    {/each}
    {#if groups.length === 0}
      <div class="card p-6 text-fg-mute text-sm col-span-full text-center">Waiting for group data…</div>
    {/if}
  </div>
</div>
