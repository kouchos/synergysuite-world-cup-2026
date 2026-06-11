<script>
  import { onMount } from 'svelte';
  import { teamFor, TEAMS } from '../lib/data/teams.js';

  let { snapshot } = $props();

  let now = $state(Date.now());
  onMount(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  // Look across both the group fixtures and the knockout matches — the
  // "next match" might be a Round of 16 if group stage just wrapped.
  const matches = $derived([
    ...(snapshot.fixtures ?? []),
    ...(snapshot.knockoutMatches ?? []),
  ]);

  const live = $derived(matches.find((m) => m.status === 'live'));

  // Next scheduled match that has two real teams known — placeholders ("1A",
  // "W74") aren't useful as a headline countdown.
  const upcoming = $derived(
    matches
      .filter(
        (m) =>
          m.status === 'scheduled' &&
          m.utc &&
          TEAMS[m.home] &&
          TEAMS[m.away],
      )
      .sort((a, b) => new Date(a.utc) - new Date(b.utc))[0],
  );

  function format(ms) {
    if (ms <= 0) return 'kickoff';
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  }

  const homeTeam = $derived(live ? teamFor(live.home) : upcoming ? teamFor(upcoming.home) : null);
  const awayTeam = $derived(live ? teamFor(live.away) : upcoming ? teamFor(upcoming.away) : null);
  const countdown = $derived(upcoming ? format(new Date(upcoming.utc) - now) : null);
</script>

{#if live}
  <div class="mx-3 sm:mx-5 mb-2 card clip-corner overflow-hidden flex items-stretch border-live/40">
    <span class="flex items-center gap-1.5 px-3 bg-live text-ink type-display text-xs">
      <span class="live-dot inline-block w-1.5 h-1.5 rounded-full bg-ink"></span>
      LIVE
    </span>
    <div class="flex-1 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 px-3 py-1.5">
      <span class="text-lg leading-none" aria-hidden="true">{homeTeam?.flag}</span>
      <span class="font-semibold text-sm">{homeTeam?.name}</span>
      {#key `${live.homeGoals}-${live.awayGoals}`}
        <span class="score-pop type-display text-xl text-fg tnum">{live.homeGoals}<span class="text-fg-faint mx-0.5">–</span>{live.awayGoals}</span>
      {/key}
      <span class="font-semibold text-sm">{awayTeam?.name}</span>
      <span class="text-lg leading-none" aria-hidden="true">{awayTeam?.flag}</span>
      {#if live.minute != null}
        <span class="type-display text-sm text-live tnum">{live.minute}'</span>
      {/if}
    </div>
  </div>
{:else if upcoming}
  <div class="mx-3 sm:mx-5 mb-2 card clip-corner overflow-hidden flex items-stretch">
    <span class="flex items-center px-3 bg-volt text-ink type-display text-xs whitespace-nowrap">Next match</span>
    <div class="flex-1 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 px-3 py-1.5">
      <span class="text-lg leading-none" aria-hidden="true">{homeTeam?.flag}</span>
      <span class="font-semibold text-sm">{homeTeam?.name}</span>
      <span class="type-kicker text-fg-faint">vs</span>
      <span class="font-semibold text-sm">{awayTeam?.name}</span>
      <span class="text-lg leading-none" aria-hidden="true">{awayTeam?.flag}</span>
      <span class="text-fg-faint hidden sm:inline">·</span>
      <span class="type-display text-base text-volt tnum">{countdown}</span>
    </div>
  </div>
{/if}
