<script>
  import MatchCard from '../components/MatchCard.svelte';
  import { TEAMS } from '../lib/data/teams.js';
  import { formatDay, dayKey } from '../lib/format.js';

  // NB: alias the prop away from `state` — a local binding named `state` would
  // shadow the `$state` rune (Svelte would read `$state(...)` as a store
  // subscription on the prop), silently dropping the component into legacy mode.
  let { state: snapshot, employees } = $props();

  const ROUND_LABEL = {
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter-final',
    SF: 'Semi-final',
    Third: 'Third place',
    Final: 'Final',
  };
  function stageLabel(m) {
    if (m.group) return `Group ${m.group}`;
    if (m.round) return ROUND_LABEL[m.round] ?? 'Knockout';
    return null;
  }

  // Group fixtures + any knockout tie whose teams are both resolved (placeholder
  // "W74"-style cells live in the bracket, not the schedule).
  const allMatches = $derived.by(() => {
    const group = snapshot.fixtures ?? [];
    const ko = (snapshot.knockoutMatches ?? []).filter((m) => TEAMS[m.home] && TEAMS[m.away]);
    return [...group, ...ko].filter((m) => m.utc);
  });

  const byUtcAsc = (a, b) => new Date(a.utc) - new Date(b.utc);
  const byUtcDesc = (a, b) => new Date(b.utc) - new Date(a.utc);

  const live = $derived(allMatches.filter((m) => m.status === 'live').sort(byUtcAsc));
  // "Upcoming" means the kickoff is still ahead of us — a scheduled game whose
  // kickoff has already passed is a stale fixture the feed never resolved (a
  // played group game we never got a result for), not something coming up.
  const upcoming = $derived(
    allMatches
      .filter((m) => m.status === 'scheduled' && new Date(m.utc).getTime() > Date.now())
      .sort(byUtcAsc),
  );
  const results = $derived(allMatches.filter((m) => m.status === 'final').sort(byUtcDesc));

  // Bucket a sorted list into consecutive matchdays.
  function byDay(list) {
    const out = [];
    let cur = null;
    for (const m of list) {
      const key = dayKey(m.utc);
      if (!cur || cur.key !== key) {
        cur = { key, label: formatDay(m.utc), matches: [] };
        out.push(cur);
      }
      cur.matches.push(m);
    }
    return out;
  }

  const upcomingDays = $derived(byDay(upcoming));
  const resultDays = $derived(byDay(results));

  // Default to whichever side has something to show — upcoming first, but flip
  // to results once the tournament's done.
  let tab = $state(null);
  const activeTab = $derived(tab ?? (upcoming.length ? 'upcoming' : 'results'));
</script>

<div class="px-3 sm:px-5 py-3 space-y-4 max-w-3xl mx-auto">
  {#if live.length}
    <section class="rise-in">
      <h2 class="type-kicker text-live kicker-slash mb-2">Live now</h2>
      <div class="space-y-2">
        {#each live as m (m.id)}
          <MatchCard match={m} {employees} stage={stageLabel(m)} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Upcoming / Results toggle -->
  <div class="inline-flex p-1 gap-1 card rounded-lg">
    <button
      type="button"
      onclick={() => (tab = 'upcoming')}
      data-active={activeTab === 'upcoming' || undefined}
      class="pressable px-3.5 py-1.5 rounded-md type-display text-[13px]
        {activeTab === 'upcoming' ? 'bg-volt text-ink' : 'text-fg-mute hover:text-fg'}"
    >
      Upcoming{#if upcoming.length}<span class="ml-1.5 tnum opacity-70">{upcoming.length}</span>{/if}
    </button>
    <button
      type="button"
      onclick={() => (tab = 'results')}
      data-active={activeTab === 'results' || undefined}
      class="pressable px-3.5 py-1.5 rounded-md type-display text-[13px]
        {activeTab === 'results' ? 'bg-volt text-ink' : 'text-fg-mute hover:text-fg'}"
    >
      Results{#if results.length}<span class="ml-1.5 tnum opacity-70">{results.length}</span>{/if}
    </button>
  </div>

  {#if activeTab === 'upcoming'}
    {#if upcomingDays.length}
      <div class="space-y-5">
        {#each upcomingDays as day (day.key)}
          <section class="rise-in">
            <h3 class="type-kicker text-volt mb-2">{day.label}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {#each day.matches as m (m.id)}
                <MatchCard match={m} {employees} stage={stageLabel(m)} />
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {:else}
      <div class="card p-6 text-center text-fg-mute text-sm">No upcoming games scheduled.</div>
    {/if}
  {:else}
    {#if resultDays.length}
      <div class="space-y-5">
        {#each resultDays as day (day.key)}
          <section class="rise-in">
            <h3 class="type-kicker text-fg-mute mb-2">{day.label}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {#each day.matches as m (m.id)}
                <MatchCard match={m} {employees} stage={stageLabel(m)} />
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {:else}
      <div class="card p-6 text-center text-fg-mute text-sm">No games played yet.</div>
    {/if}
  {/if}
</div>
