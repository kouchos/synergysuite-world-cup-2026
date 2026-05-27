<script>
  import { teamFor, TEAMS } from '../lib/data/teams.js';
  import { formatKickoff, timeUntil } from '../lib/format.js';
  import {
    hasMatchActivity,
    overallLeaderboard,
    worstTeam,
    mostCardsLeaderboard,
    goldenBootLeader,
  } from '../lib/state/prizes.js';

  let { state, employees } = $props();

  const active = $derived(hasMatchActivity(state));
  const overall = $derived(active ? overallLeaderboard(state, employees) : []);
  const worst = $derived(active ? worstTeam(state, employees) : null);
  const cards = $derived(active ? mostCardsLeaderboard(state, employees) : []);
  const boot = $derived(active ? goldenBootLeader(state, employees) : null);

  const overallLeader = $derived(overall[0]);
  const cardsLeader = $derived(cards[0]);

  // For the pre-tournament hero — find the very first real-team match.
  const firstMatch = $derived(
    [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])]
      .filter((m) => m.utc && TEAMS[m.home] && TEAMS[m.away])
      .sort((a, b) => new Date(a.utc) - new Date(b.utc))[0],
  );
</script>

{#if !active}
  <!-- Pre-tournament hero: no real prize data yet, so don't fake it. -->
  <header class="p-4">
    <div class="rounded-2xl bg-gradient-to-br from-emerald-500/15 via-pitch-light/60 to-pitch/30 ring-1 ring-emerald-300/20 px-8 py-6 backdrop-blur flex items-center gap-6">
      <div class="text-5xl">⚽</div>
      <div class="flex-1">
        <div class="text-emerald-200/80 text-xs uppercase tracking-[0.3em] font-bold mb-1">
          World Cup 2026 — Sweepstake live tracker
        </div>
        <div class="text-3xl font-bold leading-tight">
          {#if firstMatch}
            Kicks off {formatKickoff(firstMatch.utc)}
          {:else}
            Tournament starts 11 Jun 2026
          {/if}
        </div>
        {#if firstMatch}
          {@const ht = teamFor(firstMatch.home)}
          {@const at = teamFor(firstMatch.away)}
          {@const until = timeUntil(firstMatch.utc)}
          <div class="mt-2 text-stone-300 text-base">
            First match:
            <span class="text-xl">{ht.flag}</span>
            <span class="font-semibold text-white">{ht.name}</span>
            <span class="text-stone-500">vs</span>
            <span class="font-semibold text-white">{at.name}</span>
            <span class="text-xl">{at.flag}</span>
            {#if until}
              <span class="text-stone-500">·</span>
              <span class="text-emerald-200 font-semibold">{until}</span>
            {/if}
          </div>
        {/if}
        <div class="mt-2 text-stone-400 text-xs italic">
          Prize tiles will populate once the first ball is kicked.
        </div>
      </div>
    </div>
  </header>
{:else}
  <header class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
    <!-- Overall leader -->
    <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur flex flex-col">
      <div class="text-xs uppercase tracking-widest text-emerald-200/80 mb-3">Overall leader</div>
      {#if overallLeader}
        <div class="flex items-center gap-3">
          <span
            class="w-3 h-12 rounded-full flex-shrink-0"
            style:background-color={overallLeader.employee.color}
          ></span>
          <span class="text-4xl font-bold leading-none">{overallLeader.employee.name}</span>
        </div>
        <div class="mt-3 text-stone-300 text-sm tabular-nums">
          {overallLeader.pts} pts &middot; GD {overallLeader.gd >= 0 ? '+' : ''}{overallLeader.gd}
        </div>
      {/if}
    </div>

    <!-- Worst team -->
    <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur flex flex-col">
      <div class="text-xs uppercase tracking-widest text-rose-200/80 mb-3">Worst team</div>
      {#if worst}
        {@const t = teamFor(worst.row.fifaCode)}
        <div class="flex items-center gap-3">
          <span class="text-5xl leading-none">{t.flag}</span>
          <div class="min-w-0">
            <div class="text-2xl font-bold leading-tight truncate">{t.name}</div>
            {#if worst.owner}
              <div class="mt-1 inline-flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" style:background-color={worst.owner.color}></span>
                <span class="text-sm font-semibold" style:color={worst.owner.color}>{worst.owner.name}</span>
              </div>
            {/if}
          </div>
        </div>
        <div class="mt-3 text-stone-300 text-sm tabular-nums">
          {worst.row.pts} pts &middot; GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd}
        </div>
      {/if}
    </div>

    <!-- Most cards -->
    <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur flex flex-col">
      <div class="text-xs uppercase tracking-widest text-amber-200/80 mb-3">Most cards</div>
      {#if cardsLeader}
        <div class="flex items-center gap-3">
          <span
            class="w-3 h-12 rounded-full flex-shrink-0"
            style:background-color={cardsLeader.employee.color}
          ></span>
          <span class="text-4xl font-bold leading-none">{cardsLeader.employee.name}</span>
        </div>
        <div class="mt-3 text-stone-300 text-sm tabular-nums flex items-center gap-3">
          <span class="inline-flex items-center gap-1">🟨 {cardsLeader.yellow}</span>
          <span class="inline-flex items-center gap-1">🟥 {cardsLeader.red}</span>
          <span class="text-stone-400">({cardsLeader.points} pts)</span>
        </div>
      {/if}
    </div>

    <!-- Golden boot -->
    <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur flex flex-col">
      <div class="text-xs uppercase tracking-widest text-yellow-200/80 mb-3">Golden boot</div>
      {#if boot}
        {@const t = teamFor(boot.team)}
        <div class="flex items-center gap-3">
          <span class="text-5xl leading-none">{t.flag}</span>
          <div class="min-w-0">
            <div class="text-xl font-bold leading-tight truncate">{boot.player}</div>
            {#if boot.owner}
              <div class="mt-1 inline-flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" style:background-color={boot.owner.color}></span>
                <span class="text-sm font-semibold" style:color={boot.owner.color}>{boot.owner.name}</span>
              </div>
            {/if}
          </div>
        </div>
        <div class="mt-3 text-stone-300 text-sm tabular-nums">{boot.goals} goals</div>
      {/if}
    </div>
  </header>
{/if}
