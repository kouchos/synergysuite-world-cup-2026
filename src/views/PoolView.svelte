<script>
  import GroupTable from '../components/GroupTable.svelte';
  import MatchCard from '../components/MatchCard.svelte';

  let { state, employees } = $props();

  const groups = $derived(state.groups ?? []);

  const recent = $derived(
    (state.fixtures ?? [])
      .filter((f) => f.status === 'final')
      .sort((a, b) => new Date(b.utc) - new Date(a.utc))
      .slice(0, 8)
  );
  const live = $derived((state.fixtures ?? []).filter((f) => f.status === 'live'));
  const upcoming = $derived(
    (state.fixtures ?? [])
      .filter((f) => f.status === 'scheduled')
      .sort((a, b) => new Date(a.utc) - new Date(b.utc))
      .slice(0, 8)
  );
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
  <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    {#each groups as g (g.id)}
      <GroupTable group={g} {employees} />
    {/each}
    {#if groups.length === 0}
      <div class="text-stone-300/70 italic">Waiting for group data…</div>
    {/if}
  </div>

  <aside class="space-y-4">
    {#if live.length}
      <section>
        <h2 class="text-sm font-bold uppercase tracking-widest text-rose-200/80 mb-2">Live now</h2>
        <div class="space-y-2">
          {#each live as m (m.id)}
            <MatchCard match={m} {employees} />
          {/each}
        </div>
      </section>
    {/if}

    {#if upcoming.length}
      <section>
        <h2 class="text-sm font-bold uppercase tracking-widest text-emerald-200/80 mb-2">Upcoming</h2>
        <div class="space-y-2">
          {#each upcoming as m (m.id)}
            <MatchCard match={m} {employees} />
          {/each}
        </div>
      </section>
    {/if}

    {#if recent.length}
      <section>
        <h2 class="text-sm font-bold uppercase tracking-widest text-stone-200/80 mb-2">Recent results</h2>
        <div class="space-y-2">
          {#each recent as m (m.id)}
            <MatchCard match={m} {employees} />
          {/each}
        </div>
      </section>
    {/if}
  </aside>
</div>
