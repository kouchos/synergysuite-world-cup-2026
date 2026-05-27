<script>
  import { teamFor } from '../lib/data/teams.js';
  import { formatKickoff } from '../lib/format.js';
  import OwnerBadge from './OwnerBadge.svelte';
  import LiveDot from './LiveDot.svelte';

  let { match, employees } = $props();

  const home = $derived(teamFor(match.home));
  const away = $derived(teamFor(match.away));
  const homeOwner = $derived(
    employees?.find((e) => e.teams.some((t) => t.fifaCode === match.home)) ?? null
  );
  const awayOwner = $derived(
    employees?.find((e) => e.teams.some((t) => t.fifaCode === match.away)) ?? null
  );
</script>

<div class="rounded-xl bg-pitch-light/40 ring-1 ring-white/10 p-3 flex items-center gap-3">
  <div class="flex-1 flex flex-col items-end gap-1">
    <div class="flex items-center gap-2">
      <span class="font-medium">{home.name}</span>
      <span class="text-2xl">{home.flag}</span>
    </div>
    <OwnerBadge employee={homeOwner} size="sm" />
  </div>

  <div class="px-3 text-center min-w-[78px]">
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
  </div>

  <div class="flex-1 flex flex-col items-start gap-1">
    <div class="flex items-center gap-2">
      <span class="text-2xl">{away.flag}</span>
      <span class="font-medium">{away.name}</span>
    </div>
    <OwnerBadge employee={awayOwner} size="sm" />
  </div>
</div>
