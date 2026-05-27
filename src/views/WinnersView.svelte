<script>
  import { teamFor } from '../lib/data/teams.js';
  import {
    tournamentWinner,
    worstTeam,
    mostCardsLeaderboard,
    goldenBootLeader,
  } from '../lib/state/prizes.js';
  import OwnerBadge from '../components/OwnerBadge.svelte';

  let { state, employees } = $props();

  const winner = $derived(tournamentWinner(state, employees));
  const worst = $derived(worstTeam(state, employees));
  const cards = $derived(mostCardsLeaderboard(state, employees));
  const boot = $derived(goldenBootLeader(state, employees));
  const cardsLeader = $derived(cards[0]);
</script>

{#if !winner}
  <div class="p-12 text-center text-stone-300/80">
    <div class="text-6xl mb-4">🏆</div>
    <h2 class="text-3xl font-bold mb-2 text-white">Tournament still in progress</h2>
    <p class="italic">Come back after the final on 19 July 2026 to see who lifted the cup — and which sweepstake prizes landed.</p>
  </div>
{:else}
  {@const championTeam = teamFor(winner.team)}
  {@const runnerUpTeam = teamFor(winner.opponent)}
  <div class="p-6 flex flex-col gap-6">
    <!-- Champion hero -->
    <section class="rounded-3xl bg-gradient-to-br from-amber-400/20 via-pitch-light/50 to-pitch/30 ring-1 ring-amber-300/30 px-8 py-10 text-center backdrop-blur">
      <div class="text-amber-300 text-sm uppercase tracking-[0.3em] font-bold mb-4">
        🏆 World Cup 2026 — Champions
      </div>
      <div class="text-9xl leading-none mb-4">{championTeam.flag}</div>
      <div class="text-6xl font-bold mb-3">{championTeam.name}</div>
      {#if winner.owner}
        <div class="inline-flex items-center gap-3 mt-2">
          <span class="text-stone-300 text-lg">Sweepstake prize</span>
          <span class="text-stone-400">→</span>
          <OwnerBadge employee={winner.owner} size="xl" />
        </div>
      {/if}
      <div class="mt-6 text-stone-300 text-base">
        Beat <span class="font-semibold text-white">{runnerUpTeam.name}</span>
        {#if winner.opponentOwner}
          (<span style:color={winner.opponentOwner.color} class="font-semibold">{winner.opponentOwner.name}</span>)
        {/if}
        <span class="font-bold text-white tabular-nums">{winner.score}</span> in the final
      </div>
    </section>

    <!-- Secondary prize cards -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Worst team -->
      <article class="rounded-2xl bg-pitch-light/60 ring-1 ring-rose-300/20 p-6 backdrop-blur">
        <div class="text-rose-200/80 text-xs uppercase tracking-widest font-bold mb-4">🥄 Worst team</div>
        {#if worst}
          {@const t = teamFor(worst.row.fifaCode)}
          <div class="flex items-center gap-4">
            <span class="text-7xl leading-none">{t.flag}</span>
            <div>
              <div class="text-3xl font-bold leading-tight">{t.name}</div>
              {#if worst.owner}
                <div class="mt-2"><OwnerBadge employee={worst.owner} size="lg" /></div>
              {/if}
            </div>
          </div>
          <div class="mt-4 text-stone-300 text-sm">
            {worst.row.pts} pts &middot; GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd} &middot; {worst.row.gf} goals scored
          </div>
        {/if}
      </article>

      <!-- Most cards -->
      <article class="rounded-2xl bg-pitch-light/60 ring-1 ring-amber-300/20 p-6 backdrop-blur">
        <div class="text-amber-200/80 text-xs uppercase tracking-widest font-bold mb-4">🟨🟥 Most cards</div>
        {#if cardsLeader}
          <OwnerBadge employee={cardsLeader.employee} size="xl" />
          <div class="mt-4 flex items-center gap-3 text-stone-200 text-lg">
            <span class="flex items-center gap-1.5">🟨 <span class="font-bold tabular-nums">{cardsLeader.yellow}</span></span>
            <span class="flex items-center gap-1.5">🟥 <span class="font-bold tabular-nums">{cardsLeader.red}</span></span>
          </div>
          <div class="mt-2 text-3xl font-bold text-amber-200 tabular-nums">{cardsLeader.points} pts</div>
        {/if}
      </article>

      <!-- Golden boot -->
      <article class="rounded-2xl bg-pitch-light/60 ring-1 ring-yellow-300/20 p-6 backdrop-blur">
        <div class="text-yellow-200/80 text-xs uppercase tracking-widest font-bold mb-4">👟 Golden boot</div>
        {#if boot}
          {@const t = teamFor(boot.team)}
          <div class="flex items-center gap-4">
            <span class="text-6xl leading-none">{t.flag}</span>
            <div>
              <div class="text-2xl font-bold leading-tight">{boot.player}</div>
              <div class="text-sm text-stone-300 mt-0.5">{t.name}</div>
              {#if boot.owner}
                <div class="mt-2"><OwnerBadge employee={boot.owner} size="lg" /></div>
              {/if}
            </div>
          </div>
          <div class="mt-4 text-3xl font-bold text-yellow-200 tabular-nums">{boot.goals} goals</div>
        {/if}
      </article>
    </section>
  </div>
{/if}
