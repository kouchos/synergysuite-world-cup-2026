<script>
  import { teamFor } from '../lib/data/teams.js';
  import {
    overallLeaderboard,
    worstTeam,
    mostCardsLeaderboard,
    goldenBootLeader,
  } from '../lib/state/prizes.js';
  import OwnerBadge from './OwnerBadge.svelte';

  let { state, employees } = $props();

  const overall = $derived(overallLeaderboard(state, employees));
  const worst = $derived(worstTeam(state, employees));
  const cards = $derived(mostCardsLeaderboard(state, employees));
  const boot = $derived(goldenBootLeader(state, employees));

  const overallLeader = $derived(overall[0]);
  const cardsLeader = $derived(cards[0]);
</script>

<header class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
  <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur">
    <div class="text-xs uppercase tracking-widest text-emerald-200/80">Overall leader</div>
    {#if overallLeader}
      <div class="mt-2 flex items-center gap-3">
        <OwnerBadge employee={overallLeader.employee} size="xl" />
      </div>
      <div class="mt-2 text-stone-200/90 text-sm">
        {overallLeader.pts} pts &middot; GD {overallLeader.gd >= 0 ? '+' : ''}{overallLeader.gd}
      </div>
    {/if}
  </div>

  <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur">
    <div class="text-xs uppercase tracking-widest text-rose-200/80">Worst team</div>
    {#if worst}
      {@const t = teamFor(worst.row.fifaCode)}
      <div class="mt-2 flex items-center gap-3">
        <span class="text-5xl">{t.flag}</span>
        <div>
          <div class="text-2xl font-semibold leading-tight">{t.name}</div>
          {#if worst.owner}
            <div class="mt-1"><OwnerBadge employee={worst.owner} size="sm" /></div>
          {/if}
        </div>
      </div>
      <div class="mt-2 text-stone-200/90 text-sm">
        {worst.row.pts} pts &middot; GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd}
      </div>
    {/if}
  </div>

  <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur">
    <div class="text-xs uppercase tracking-widest text-amber-200/80">Most cards</div>
    {#if cardsLeader}
      <div class="mt-2 flex items-center gap-3">
        <OwnerBadge employee={cardsLeader.employee} size="xl" />
      </div>
      <div class="mt-2 text-stone-200/90 text-sm">
        🟨 {cardsLeader.yellow} &nbsp; 🟥 {cardsLeader.red} &nbsp; ({cardsLeader.points} pts)
      </div>
    {/if}
  </div>

  <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur">
    <div class="text-xs uppercase tracking-widest text-yellow-200/80">Golden boot</div>
    {#if boot}
      {@const t = teamFor(boot.team)}
      <div class="mt-2 flex items-center gap-3">
        <span class="text-4xl">{t.flag}</span>
        <div>
          <div class="text-xl font-semibold leading-tight">{boot.player}</div>
          {#if boot.owner}
            <div class="mt-1"><OwnerBadge employee={boot.owner} size="sm" /></div>
          {/if}
        </div>
      </div>
      <div class="mt-2 text-stone-200/90 text-sm">{boot.goals} goals</div>
    {/if}
  </div>
</header>
