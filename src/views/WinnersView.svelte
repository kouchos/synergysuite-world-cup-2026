<script>
  import { teamFor, TEAMS } from '../lib/data/teams.js';
  import {
    tournamentWinner,
    worstTeam,
    mostCardsLeaderboard,
    goldenBootLeader,
  } from '../lib/state/prizes.js';
  import OwnerBadge from '../components/OwnerBadge.svelte';
  import { modal } from '../lib/state/modal.svelte.js';
  import { store } from '../lib/state/store.svelte.js';

  let { state, employees } = $props();

  function openTeam(code) {
    if (store.espnReachable && TEAMS[code]) modal.team(code);
  }
  function openEmployee(emp) {
    if (emp) modal.employee(emp.id);
  }

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
    <section class="rounded-3xl bg-gradient-to-br from-amber-400/20 via-pitch-light/50 to-pitch/30 ring-1 ring-amber-300/30 px-8 py-6 text-center backdrop-blur">
      <div class="text-amber-300 text-xs uppercase tracking-[0.3em] font-bold mb-2">
        🏆 World Cup 2026 — Champions
      </div>
      <div class="flex items-center justify-center gap-6">
        <button type="button" class="group flex items-center gap-6 disabled:cursor-default" onclick={() => openTeam(winner.team)} disabled={!store.espnReachable}>
          <span class="text-7xl leading-none group-hover:scale-105 transition-transform">{championTeam.flag}</span>
          <div class="text-5xl font-bold leading-tight group-hover:underline decoration-2 underline-offset-4">{championTeam.name}</div>
        </button>
        {#if winner.owner}
          <button type="button" class="inline-flex items-center gap-2 hover:opacity-90 ml-2" onclick={() => openEmployee(winner.owner)}>
            <span class="text-stone-300 text-sm">Sweepstake prize</span>
            <span class="text-stone-500">→</span>
            <OwnerBadge employee={winner.owner} size="lg" />
          </button>
        {/if}
      </div>
      <div class="mt-3 text-stone-300 text-sm">
        Beat
        <button type="button" class="font-semibold text-white hover:underline decoration-1 underline-offset-2 disabled:no-underline disabled:cursor-default" onclick={() => openTeam(winner.opponent)} disabled={!store.espnReachable}>{runnerUpTeam.name}</button>
        {#if winner.opponentOwner}
          (<button type="button" style:color={winner.opponentOwner.color} class="font-semibold hover:underline" onclick={() => openEmployee(winner.opponentOwner)}>{winner.opponentOwner.name}</button>)
        {/if}
        <span class="font-bold text-white tabular-nums">{winner.score}</span> in the final
      </div>
    </section>

    <!-- Secondary prize cards -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Worst team -->
      <article class="rounded-2xl bg-pitch-light/60 ring-1 ring-rose-300/20 p-8 backdrop-blur">
        <div class="text-rose-200/80 text-xs uppercase tracking-widest font-bold mb-4">🥄 Worst team</div>
        {#if worst}
          {@const t = teamFor(worst.row.fifaCode)}
          <div class="flex items-center gap-4">
            <button type="button" class="text-7xl leading-none hover:scale-105 transition-transform disabled:cursor-default" onclick={() => openTeam(worst.row.fifaCode)} disabled={!store.espnReachable}>{t.flag}</button>
            <div>
              <button type="button" class="text-3xl font-bold leading-tight hover:underline decoration-2 underline-offset-4 disabled:no-underline disabled:cursor-default text-left" onclick={() => openTeam(worst.row.fifaCode)} disabled={!store.espnReachable}>{t.name}</button>
              {#if worst.owner}
                <button type="button" class="mt-2 block hover:opacity-90" onclick={() => openEmployee(worst.owner)}>
                  <OwnerBadge employee={worst.owner} size="lg" />
                </button>
              {/if}
            </div>
          </div>
          <div class="mt-4 text-stone-300 text-sm">
            {worst.row.pts} pts &middot; GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd} &middot; {worst.row.gf} goals scored
          </div>
        {/if}
      </article>

      <!-- Most cards -->
      <article class="rounded-2xl bg-pitch-light/60 ring-1 ring-amber-300/20 p-8 backdrop-blur">
        <div class="text-amber-200/80 text-xs uppercase tracking-widest font-bold mb-4">🟨🟥 Most cards</div>
        {#if cardsLeader}
          <button type="button" class="hover:opacity-90" onclick={() => openEmployee(cardsLeader.employee)}>
            <OwnerBadge employee={cardsLeader.employee} size="xl" />
          </button>
          <div class="mt-4 flex items-center gap-3 text-stone-200 text-lg">
            <span class="flex items-center gap-1.5">🟨 <span class="font-bold tabular-nums">{cardsLeader.yellow}</span></span>
            <span class="flex items-center gap-1.5">🟥 <span class="font-bold tabular-nums">{cardsLeader.red}</span></span>
          </div>
          <div class="mt-2 text-3xl font-bold text-amber-200 tabular-nums">{cardsLeader.points} pts</div>
        {/if}
      </article>

      <!-- Golden boot -->
      <article class="rounded-2xl bg-pitch-light/60 ring-1 ring-yellow-300/20 p-8 backdrop-blur">
        <div class="text-yellow-200/80 text-xs uppercase tracking-widest font-bold mb-4">👟 Golden boot</div>
        {#if boot}
          {@const t = teamFor(boot.team)}
          <div class="flex items-center gap-4">
            <button type="button" class="text-6xl leading-none hover:scale-105 transition-transform disabled:cursor-default" onclick={() => openTeam(boot.team)} disabled={!store.espnReachable}>{t.flag}</button>
            <div>
              <div class="text-2xl font-bold leading-tight">{boot.player}</div>
              <button type="button" class="text-sm text-stone-300 mt-0.5 hover:underline decoration-1 underline-offset-2 disabled:no-underline disabled:cursor-default" onclick={() => openTeam(boot.team)} disabled={!store.espnReachable}>{t.name}</button>
              {#if boot.owner}
                <button type="button" class="mt-2 block hover:opacity-90" onclick={() => openEmployee(boot.owner)}>
                  <OwnerBadge employee={boot.owner} size="lg" />
                </button>
              {/if}
            </div>
          </div>
          <div class="mt-4 text-3xl font-bold text-yellow-200 tabular-nums">{boot.goals} goals</div>
        {/if}
      </article>
    </section>
  </div>
{/if}
