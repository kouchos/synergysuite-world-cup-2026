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

<div class="grid grid-cols-1 lg:grid-cols-3 gap-3 px-3 sm:px-5 py-3">
  <!-- Matchday rail leads on mobile (the live stuff matters most on a phone),
       sits right of the groups on desktop. -->
  <aside class="space-y-4 order-first lg:order-last">
    {#if live.length}
      <section class="rise-in">
        <h2 class="type-kicker text-live kicker-slash mb-2">Live now</h2>
        <div class="space-y-2">
          {#each live as m (m.id)}
            <MatchCard match={m} {employees} />
          {/each}
        </div>
      </section>
    {/if}

    {#if upcoming.length}
      <section class="rise-in" style:--stagger="60ms">
        <h2 class="type-kicker text-volt kicker-slash mb-2">Upcoming</h2>
        <div class="space-y-2">
          {#each upcoming as m (m.id)}
            <MatchCard match={m} {employees} />
          {/each}
        </div>
      </section>
    {/if}

    {#if recent.length}
      <section class="rise-in" style:--stagger="120ms">
        <h2 class="type-kicker text-fg-mute kicker-slash mb-2">Recent results</h2>
        <div class="space-y-2">
          {#each recent as m (m.id)}
            <MatchCard match={m} {employees} />
          {/each}
        </div>
      </section>
    {/if}
  </aside>

  <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 content-start">
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
