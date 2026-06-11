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
  class="bracket-cell relative rounded-md overflow-hidden card lift transition-colors
    {isLive ? 'border-live/70 shadow-[0_0_14px_rgba(255,77,93,0.22)]' : ''}"
  data-live={isLive || undefined}
>
  <!-- Home row -->
  <div class="flex items-center h-[26px] pr-1 {homeWon ? 'bg-volt/8' : ''}">
    <button
      type="button"
      class="w-1 self-stretch shrink-0 hover:w-1.5 transition-all"
      style:background-color={homeOwner?.color ?? 'transparent'}
      aria-label={homeOwner ? `Open ${homeOwner.name}'s page` : ''}
      onclick={(e) => openOwner(homeOwner, e)}
      disabled={!homeOwner}
    ></button>
    {#if homeTeam}
      <button type="button" class="ml-1.5 flex items-center gap-1.5 pressable disabled:cursor-default" onclick={(e) => openTeam(match.home, e)} disabled={!store.espnReachable}>
        <span class="text-sm leading-none" aria-hidden="true">{homeTeam.flag}</span>
        <span class="text-[11px] type-cond font-bold tracking-wide {homeWon ? 'text-volt' : 'text-fg-mute'}">{match.home}</span>
      </button>
      <button type="button" class="ml-auto text-xs type-display tnum px-1.5 {homeWon ? 'text-volt' : 'text-fg-mute'} hover:bg-ink-4 rounded disabled:hover:bg-transparent disabled:cursor-default" onclick={openGame} disabled={!gameClickable}>
        {#if isScheduled}
          <span class="text-[10px] type-cond not-italic font-medium text-fg-faint">{formatTime(match.utc)}</span>
        {:else if match.homeGoals != null}
          {match.homeGoals}
        {/if}
      </button>
    {:else if match.home}
      <span class="ml-2 text-[10px] type-cond text-fg-faint">{match.home}</span>
      {#if isScheduled}
        <span class="ml-auto text-[10px] type-cond text-fg-faint pr-1">{formatTime(match.utc)}</span>
      {/if}
    {:else}
      <span class="ml-2 text-[10px] type-cond text-fg-faint/70">TBD</span>
      {#if isScheduled}
        <span class="ml-auto text-[10px] type-cond text-fg-faint pr-1">{formatTime(match.utc)}</span>
      {/if}
    {/if}
  </div>

  <div class="border-t border-line/60"></div>

  <!-- Away row -->
  <div class="flex items-center h-[26px] pr-1 {awayWon ? 'bg-volt/8' : ''}">
    <button
      type="button"
      class="w-1 self-stretch shrink-0 hover:w-1.5 transition-all"
      style:background-color={awayOwner?.color ?? 'transparent'}
      aria-label={awayOwner ? `Open ${awayOwner.name}'s page` : ''}
      onclick={(e) => openOwner(awayOwner, e)}
      disabled={!awayOwner}
    ></button>
    {#if awayTeam}
      <button type="button" class="ml-1.5 flex items-center gap-1.5 pressable disabled:cursor-default" onclick={(e) => openTeam(match.away, e)} disabled={!store.espnReachable}>
        <span class="text-sm leading-none" aria-hidden="true">{awayTeam.flag}</span>
        <span class="text-[11px] type-cond font-bold tracking-wide {awayWon ? 'text-volt' : 'text-fg-mute'}">{match.away}</span>
      </button>
      <button type="button" class="ml-auto text-xs type-display tnum px-1.5 {awayWon ? 'text-volt' : 'text-fg-mute'} hover:bg-ink-4 rounded disabled:hover:bg-transparent disabled:cursor-default" onclick={openGame} disabled={!gameClickable}>
        {#if match.awayGoals != null}
          {match.awayGoals}
        {/if}
      </button>
      {#if isLive}
        <span class="ml-1 text-[10px] type-display text-live tnum">{match.minute}'</span>
      {/if}
    {:else if match.away}
      <span class="ml-2 text-[10px] type-cond text-fg-faint">{match.away}</span>
    {:else}
      <span class="ml-2 text-[10px] type-cond text-fg-faint/70">TBD</span>
    {/if}
  </div>
</div>
