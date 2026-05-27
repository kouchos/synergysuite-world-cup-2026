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
  <div class="px-4 py-2 flex items-center justify-center gap-3 text-sm bg-rose-500/10 border-y border-rose-400/20">
    <span class="inline-flex items-center gap-1.5 text-rose-300 font-bold uppercase tracking-widest text-xs">
      <span class="w-1.5 h-1.5 rounded-full bg-rose-400 live-dot"></span>
      Live
    </span>
    <span class="text-stone-300">·</span>
    <span class="text-lg">{homeTeam?.flag}</span>
    <span class="font-semibold text-white">{homeTeam?.name}</span>
    <span class="font-bold tabular-nums text-white">{live.homeGoals}</span>
    <span class="text-stone-400">–</span>
    <span class="font-bold tabular-nums text-white">{live.awayGoals}</span>
    <span class="font-semibold text-white">{awayTeam?.name}</span>
    <span class="text-lg">{awayTeam?.flag}</span>
    {#if live.minute != null}
      <span class="text-stone-300">·</span>
      <span class="font-bold tabular-nums text-rose-200">{live.minute}'</span>
    {/if}
  </div>
{:else if upcoming}
  <div class="px-4 py-2 flex items-center justify-center gap-3 text-sm border-y border-white/5">
    <span class="text-emerald-200/70 font-bold uppercase tracking-widest text-xs">Next match</span>
    <span class="text-stone-400">·</span>
    <span class="text-lg">{homeTeam?.flag}</span>
    <span class="font-semibold text-white">{homeTeam?.name}</span>
    <span class="text-stone-400">vs</span>
    <span class="font-semibold text-white">{awayTeam?.name}</span>
    <span class="text-lg">{awayTeam?.flag}</span>
    <span class="text-stone-400">·</span>
    <span class="font-bold tabular-nums text-emerald-200">kickoff in {countdown}</span>
  </div>
{/if}
