<script>
  import { teamFor, TEAMS } from '../lib/data/teams.js';
  import { formatKickoff } from '../lib/format.js';
  import OwnerBadge from './OwnerBadge.svelte';
  import LiveDot from './LiveDot.svelte';
  import { modal } from '../lib/state/modal.svelte.js';
  import { store } from '../lib/state/store.svelte.js';

  let { match, employees } = $props();

  const home = $derived(teamFor(match.home));
  const away = $derived(teamFor(match.away));
  const homeOwner = $derived(
    employees?.find((e) => e.teams.some((t) => t.fifaCode === match.home)) ?? null
  );
  const awayOwner = $derived(
    employees?.find((e) => e.teams.some((t) => t.fifaCode === match.away)) ?? null
  );

  // Both teams owned by the same employee = sweepstake derby: they win and
  // lose at the same time. (Every team has an owner, so owner-vs-owner
  // matchups are just... every match.)
  const isDerby = $derived(homeOwner && awayOwner && homeOwner.id === awayOwner.id);

  const gameClickable = $derived(
    store.espnReachable && match.id && !String(match.id).startsWith('of-'),
  );
  function openGame() {
    if (gameClickable) modal.game(match.id);
  }
  function openTeam(code) {
    if (store.espnReachable && TEAMS[code]) modal.team(code);
  }
  function openOwner(emp) {
    if (emp) modal.employee(emp.id);
  }
</script>

<div
  class="card lift p-2.5 flex items-center gap-2 {match.status === 'live' ? 'border-live/40' : isDerby ? 'border-gold/30' : ''}"
  title={isDerby ? `Sweepstake derby: ${homeOwner.name} vs ${homeOwner.name} — wins either way` : undefined}
>
  <div class="flex-1 min-w-0 flex flex-col items-end gap-1">
    <button type="button" class="flex items-center gap-1.5 min-w-0 pressable disabled:cursor-default" onclick={() => openTeam(match.home)} disabled={!store.espnReachable}>
      <span class="font-semibold text-[13px] truncate">{home.name}</span>
      <span class="text-xl leading-none" aria-hidden="true">{home.flag}</span>
    </button>
    <button type="button" class="pressable disabled:cursor-default" onclick={() => openOwner(homeOwner)} disabled={!homeOwner}>
      <OwnerBadge employee={homeOwner} size="sm" />
    </button>
  </div>

  <button type="button" class="px-2 py-1 text-center min-w-[72px] rounded-md pressable hover:bg-ink-3 disabled:hover:bg-transparent disabled:cursor-default" onclick={openGame} disabled={!gameClickable}>
    {#if match.status === 'final' || match.status === 'live'}
      {#key `${match.homeGoals}-${match.awayGoals}`}
        <div class="score-pop type-display text-xl tnum">
          {match.homeGoals}<span class="text-fg-faint mx-0.5 not-italic">–</span>{match.awayGoals}
        </div>
      {/key}
      {#if match.status === 'live'}
        <div class="mt-0.5 flex justify-center"><LiveDot label={match.minute ? `${match.minute}'` : 'LIVE'} /></div>
      {:else}
        <div class="type-kicker text-fg-faint mt-1">FT</div>
      {/if}
    {:else}
      <div class="text-[11px] type-cond text-fg-mute leading-tight">{formatKickoff(match.utc)}</div>
    {/if}
    {#if isDerby}
      <div class="mt-1 type-kicker text-[9px] text-gold flex items-center justify-center gap-1">
        <span aria-hidden="true">⚔️</span> derby
      </div>
    {/if}
  </button>

  <div class="flex-1 min-w-0 flex flex-col items-start gap-1">
    <button type="button" class="flex items-center gap-1.5 min-w-0 pressable disabled:cursor-default" onclick={() => openTeam(match.away)} disabled={!store.espnReachable}>
      <span class="text-xl leading-none" aria-hidden="true">{away.flag}</span>
      <span class="font-semibold text-[13px] truncate">{away.name}</span>
    </button>
    <button type="button" class="pressable disabled:cursor-default" onclick={() => openOwner(awayOwner)} disabled={!awayOwner}>
      <OwnerBadge employee={awayOwner} size="sm" />
    </button>
  </div>
</div>
