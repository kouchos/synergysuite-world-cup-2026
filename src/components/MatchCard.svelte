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

<div class="rounded-xl bg-pitch-light/40 ring-1 ring-white/10 p-3 flex items-center gap-3">
  <div class="flex-1 flex flex-col items-end gap-1">
    <button type="button" class="flex items-center gap-2 group/team hover:underline decoration-1 underline-offset-2 disabled:cursor-default disabled:no-underline" onclick={() => openTeam(match.home)} disabled={!store.espnReachable}>
      <span class="font-medium">{home.name}</span>
      <span class="text-2xl">{home.flag}</span>
    </button>
    <button type="button" class="hover:opacity-90 disabled:cursor-default" onclick={() => openOwner(homeOwner)} disabled={!homeOwner}>
      <OwnerBadge employee={homeOwner} size="sm" />
    </button>
  </div>

  <button type="button" class="px-3 text-center min-w-[78px] rounded hover:bg-white/5 disabled:hover:bg-transparent disabled:cursor-default" onclick={openGame} disabled={!gameClickable}>
    {#if match.status === 'final' || match.status === 'live'}
      <div class="text-2xl font-bold tabular-nums">
        {match.homeGoals}<span class="text-stone-400 mx-1">–</span>{match.awayGoals}
      </div>
      {#if match.status === 'live'}
        <div class="mt-0.5"><LiveDot label={match.minute ? `${match.minute}'` : 'LIVE'} /></div>
      {:else}
        <div class="text-xs text-stone-400 mt-0.5">FT</div>
      {/if}
    {:else}
      <div class="text-xs text-stone-300">{formatKickoff(match.utc)}</div>
    {/if}
  </button>

  <div class="flex-1 flex flex-col items-start gap-1">
    <button type="button" class="flex items-center gap-2 group/team hover:underline decoration-1 underline-offset-2 disabled:cursor-default disabled:no-underline" onclick={() => openTeam(match.away)} disabled={!store.espnReachable}>
      <span class="text-2xl">{away.flag}</span>
      <span class="font-medium">{away.name}</span>
    </button>
    <button type="button" class="hover:opacity-90 disabled:cursor-default" onclick={() => openOwner(awayOwner)} disabled={!awayOwner}>
      <OwnerBadge employee={awayOwner} size="sm" />
    </button>
  </div>
</div>
