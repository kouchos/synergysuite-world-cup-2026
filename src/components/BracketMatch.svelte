<script>
  import { TEAMS, teamFor } from '../lib/data/teams.js';
  import { formatTime } from '../lib/format.js';
  import { modal } from '../lib/state/modal.svelte.js';
  import { store } from '../lib/state/store.svelte.js';

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

  // Game modal only opens when ESPN is reachable AND we have a real ESPN id
  const gameClickable = $derived(
    store.espnReachable && match.id && !String(match.id).startsWith('of-'),
  );
  function openGame(e) {
    e.stopPropagation();
    if (gameClickable) modal.game(match.id);
  }
  function openTeam(code, e) {
    e.stopPropagation();
    if (store.espnReachable && code && TEAMS[code]) modal.team(code);
  }
  function openOwner(emp, e) {
    e.stopPropagation();
    if (emp) modal.employee(emp.id);
  }
</script>

<div
  class="bracket-cell relative rounded-md overflow-hidden bg-pitch-light/50 ring-1 transition-colors
    {isLive ? 'ring-rose-500/70 shadow-[0_0_0_2px_rgba(244,63,94,0.25)]' : 'ring-white/10'}"
>
  <!-- Home row -->
  <div class="flex items-center h-6 pr-1">
    <button
      type="button"
      class="w-1 self-stretch flex-shrink-0 hover:w-1.5 transition-all"
      style:background-color={homeOwner?.color ?? 'transparent'}
      aria-label={homeOwner ? `Open ${homeOwner.name}'s page` : ''}
      onclick={(e) => openOwner(homeOwner, e)}
      disabled={!homeOwner}
    ></button>
    {#if homeTeam}
      <button type="button" class="ml-1 flex items-center gap-1 hover:underline decoration-1 underline-offset-2 disabled:cursor-default disabled:no-underline" onclick={(e) => openTeam(match.home, e)} disabled={!store.espnReachable}>
        <span class="text-sm leading-none">{homeTeam.flag}</span>
        <span class="text-[11px] font-semibold tracking-wide {homeWon ? 'text-white' : 'text-stone-300'}">{match.home}</span>
      </button>
      <button type="button" class="ml-auto text-[11px] font-bold tabular-nums px-1 {homeWon ? 'text-white' : 'text-stone-400'} hover:bg-white/10 rounded disabled:hover:bg-transparent disabled:cursor-default" onclick={openGame} disabled={!gameClickable}>
        {#if isScheduled}
          <span class="text-[10px] font-medium text-stone-300">{formatTime(match.utc)}</span>
        {:else if match.homeGoals != null}
          {match.homeGoals}
        {/if}
      </button>
    {:else if match.home}
      <span class="ml-1.5 text-[10px] italic text-stone-400">{match.home}</span>
      {#if isScheduled}
        <span class="ml-auto text-[10px] font-medium text-stone-400 pr-1">{formatTime(match.utc)}</span>
      {/if}
    {:else}
      <span class="ml-1.5 text-[10px] italic text-stone-500">TBD</span>
      {#if isScheduled}
        <span class="ml-auto text-[10px] font-medium text-stone-400 pr-1">{formatTime(match.utc)}</span>
      {/if}
    {/if}
  </div>

  <div class="border-t border-white/5"></div>

  <!-- Away row -->
  <div class="flex items-center h-6 pr-1">
    <button
      type="button"
      class="w-1 self-stretch flex-shrink-0 hover:w-1.5 transition-all"
      style:background-color={awayOwner?.color ?? 'transparent'}
      aria-label={awayOwner ? `Open ${awayOwner.name}'s page` : ''}
      onclick={(e) => openOwner(awayOwner, e)}
      disabled={!awayOwner}
    ></button>
    {#if awayTeam}
      <button type="button" class="ml-1 flex items-center gap-1 hover:underline decoration-1 underline-offset-2 disabled:cursor-default disabled:no-underline" onclick={(e) => openTeam(match.away, e)} disabled={!store.espnReachable}>
        <span class="text-sm leading-none">{awayTeam.flag}</span>
        <span class="text-[11px] font-semibold tracking-wide {awayWon ? 'text-white' : 'text-stone-300'}">{match.away}</span>
      </button>
      <button type="button" class="ml-auto text-[11px] font-bold tabular-nums px-1 {awayWon ? 'text-white' : 'text-stone-400'} hover:bg-white/10 rounded disabled:hover:bg-transparent disabled:cursor-default" onclick={openGame} disabled={!gameClickable}>
        {#if match.awayGoals != null}
          {match.awayGoals}
        {/if}
      </button>
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
