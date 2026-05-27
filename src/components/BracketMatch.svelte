<script>
  import { TEAMS, teamFor } from '../lib/data/teams.js';
  import { formatTime } from '../lib/format.js';

  let { match, employees } = $props();

  function ownerOf(code) {
    if (!code || !TEAMS[code]) return null;
    return employees?.find((e) => e.teams.some((t) => t.fifaCode === code)) ?? null;
  }

  const homeKnown = $derived(match.home && Boolean(TEAMS[match.home]));
  const awayKnown = $derived(match.away && Boolean(TEAMS[match.away]));
  const homeOwner = $derived(ownerOf(match.home));
  const awayOwner = $derived(ownerOf(match.away));
  const homeTeam = $derived(homeKnown ? teamFor(match.home) : null);
  const awayTeam = $derived(awayKnown ? teamFor(match.away) : null);
  const isFinal = $derived(match.status === 'final');
  const isLive = $derived(match.status === 'live');
  const isScheduled = $derived(match.status === 'scheduled');
  const homeWon = $derived(isFinal && match.homeGoals > match.awayGoals);
  const awayWon = $derived(isFinal && match.awayGoals > match.homeGoals);
</script>

<div
  class="bracket-cell relative rounded-md overflow-hidden bg-pitch-light/50 ring-1 transition-colors
    {isLive ? 'ring-rose-500/70 shadow-[0_0_0_2px_rgba(244,63,94,0.25)]' : 'ring-white/10'}"
>
  <!-- Home row -->
  <div class="flex items-center h-6 pr-2">
    <span class="w-1 self-stretch flex-shrink-0" style:background-color={homeOwner?.color ?? 'transparent'}></span>
    {#if homeTeam}
      <span class="ml-1.5 text-sm leading-none">{homeTeam.flag}</span>
      <span class="ml-1 text-[11px] font-semibold tracking-wide {homeWon ? 'text-white' : 'text-stone-300'}">{match.home}</span>
      <span class="ml-auto text-[11px] font-bold tabular-nums {homeWon ? 'text-white' : 'text-stone-400'}">
        {#if isScheduled}
          <span class="text-[10px] font-medium text-stone-300">{formatTime(match.utc)}</span>
        {:else if match.homeGoals != null}
          {match.homeGoals}
        {/if}
      </span>
    {:else if match.home}
      <span class="ml-1.5 text-[10px] italic text-stone-400">{match.home}</span>
      {#if isScheduled}
        <span class="ml-auto text-[10px] font-medium text-stone-400">{formatTime(match.utc)}</span>
      {/if}
    {:else}
      <span class="ml-1.5 text-[10px] italic text-stone-500">TBD</span>
      {#if isScheduled}
        <span class="ml-auto text-[10px] font-medium text-stone-400">{formatTime(match.utc)}</span>
      {/if}
    {/if}
  </div>

  <div class="border-t border-white/5"></div>

  <!-- Away row -->
  <div class="flex items-center h-6 pr-2">
    <span class="w-1 self-stretch flex-shrink-0" style:background-color={awayOwner?.color ?? 'transparent'}></span>
    {#if awayTeam}
      <span class="ml-1.5 text-sm leading-none">{awayTeam.flag}</span>
      <span class="ml-1 text-[11px] font-semibold tracking-wide {awayWon ? 'text-white' : 'text-stone-300'}">{match.away}</span>
      <span class="ml-auto text-[11px] font-bold tabular-nums {awayWon ? 'text-white' : 'text-stone-400'}">
        {#if match.awayGoals != null}
          {match.awayGoals}
        {/if}
      </span>
      {#if isLive}
        <span class="ml-1 text-[10px] font-bold text-rose-300 tabular-nums">{match.minute}'</span>
      {/if}
    {:else if match.away}
      <span class="ml-1.5 text-[10px] italic text-stone-400">{match.away}</span>
    {:else}
      <span class="ml-1.5 text-[10px] italic text-stone-500">TBD</span>
    {/if}
  </div>
</div>
