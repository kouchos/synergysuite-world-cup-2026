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
  <div class="px-3 sm:px-5 py-6">
    <div class="card clip-corner px-6 py-12 text-center rise-in">
      <div class="text-6xl mb-4" aria-hidden="true">🏆</div>
      <h2 class="type-display text-3xl mb-2">Tournament still in progress</h2>
      <p class="text-fg-mute text-sm max-w-md mx-auto">Come back after the final on 19 July 2026 to see who lifted the cup — and which sweepstake prizes landed.</p>
    </div>
  </div>
{:else}
  {@const championTeam = teamFor(winner.team)}
  {@const runnerUpTeam = teamFor(winner.opponent)}
  <div class="px-3 sm:px-5 py-3 flex flex-col gap-3">
    <!-- Champion hero -->
    <section class="card clip-corner px-5 sm:px-8 py-7 sm:py-9 text-center rise-in border-gold/35
      bg-[radial-gradient(110%_140%_at_50%_-30%,color-mix(in_srgb,var(--color-gold)_16%,var(--color-ink-2)),var(--color-ink-2)_60%)]">
      <div class="type-kicker text-gold mb-4">🏆 World Cup 2026 — Champions</div>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-7">
        <button type="button" class="group pressable flex items-center gap-4 sm:gap-6 disabled:cursor-default min-w-0" onclick={() => openTeam(winner.team)} disabled={!store.espnReachable}>
          <span class="text-6xl sm:text-7xl leading-none" aria-hidden="true">{championTeam.flag}</span>
          <span class="type-display text-[clamp(2.25rem,10vw,4.5rem)] leading-[0.85] text-gold group-hover:brightness-110">{championTeam.name}</span>
        </button>
        {#if winner.owner}
          <button type="button" class="pressable inline-flex items-center gap-2" onclick={() => openEmployee(winner.owner)}>
            <span class="type-kicker text-fg-mute">Sweepstake prize</span>
            <span class="text-fg-faint" aria-hidden="true">→</span>
            <OwnerBadge employee={winner.owner} size="lg" />
          </button>
        {/if}
      </div>
      <div class="mt-5 text-fg-mute text-sm">
        Beat
        <button type="button" class="font-bold text-fg pressable disabled:cursor-default" onclick={() => openTeam(winner.opponent)} disabled={!store.espnReachable}>{runnerUpTeam.name}</button>
        {#if winner.opponentOwner}
          (<button type="button" style:color={winner.opponentOwner.color} class="font-bold pressable" onclick={() => openEmployee(winner.opponentOwner)}>{winner.opponentOwner.name}</button>)
        {/if}
        <span class="type-display text-fg tnum text-base ml-0.5">{winner.score}</span> in the final
      </div>
    </section>

    <!-- Secondary prize cards -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- Worst team -->
      <article class="card clip-corner p-6 rise-in border-live/25" style:--stagger="80ms">
        <div class="type-kicker text-live/90 kicker-slash mb-4">🥄 Worst team</div>
        {#if worst}
          {@const t = teamFor(worst.row.fifaCode)}
          <div class="flex items-center gap-4">
            <button type="button" class="text-5xl leading-none pressable disabled:cursor-default" aria-label={t.name} onclick={() => openTeam(worst.row.fifaCode)} disabled={!store.espnReachable}>{t.flag}</button>
            <div class="min-w-0">
              <button type="button" class="type-display text-2xl leading-[0.95] pressable disabled:cursor-default text-left" onclick={() => openTeam(worst.row.fifaCode)} disabled={!store.espnReachable}>{t.name}</button>
              {#if worst.owner}
                <button type="button" class="mt-2 block pressable" onclick={() => openEmployee(worst.owner)}>
                  <OwnerBadge employee={worst.owner} size="lg" />
                </button>
              {/if}
            </div>
          </div>
          <div class="mt-4 text-fg-mute text-sm tnum type-cond">
            {worst.row.pts} pts · GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd} · {worst.row.gf} goals scored
          </div>
        {/if}
      </article>

      <!-- Most cards -->
      <article class="card clip-corner p-6 rise-in" style:--stagger="160ms">
        <div class="type-kicker text-gold/90 kicker-slash mb-4">Most cards</div>
        {#if cardsLeader}
          <button type="button" class="pressable" onclick={() => openEmployee(cardsLeader.employee)}>
            <OwnerBadge employee={cardsLeader.employee} size="xl" />
          </button>
          <div class="mt-4 flex items-center gap-4 text-fg-mute">
            <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-4 rounded-[2px] bg-[#fbbf24]" aria-hidden="true"></span> <span class="type-display text-lg tnum text-fg">{cardsLeader.yellow}</span></span>
            <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-4 rounded-[2px] bg-[#ef4444]" aria-hidden="true"></span> <span class="type-display text-lg tnum text-fg">{cardsLeader.red}</span></span>
          </div>
          <div class="mt-3 type-display text-3xl text-gold tnum">{cardsLeader.points} pts</div>
        {/if}
      </article>

      <!-- Golden boot -->
      <article class="card clip-corner p-6 rise-in border-gold/25" style:--stagger="240ms">
        <div class="type-kicker text-gold kicker-slash mb-4">👟 Golden boot</div>
        {#if boot}
          {@const t = teamFor(boot.team)}
          <div class="flex items-center gap-4">
            <button type="button" class="text-5xl leading-none pressable disabled:cursor-default" aria-label={t.name} onclick={() => openTeam(boot.team)} disabled={!store.espnReachable}>{t.flag}</button>
            <div class="min-w-0">
              <div class="type-display text-2xl leading-[0.95]">{boot.player}</div>
              <button type="button" class="text-sm text-fg-mute mt-1 pressable disabled:cursor-default" onclick={() => openTeam(boot.team)} disabled={!store.espnReachable}>{t.name}</button>
              {#if boot.owner}
                <button type="button" class="mt-2 block pressable" onclick={() => openEmployee(boot.owner)}>
                  <OwnerBadge employee={boot.owner} size="lg" />
                </button>
              {/if}
            </div>
          </div>
          <div class="mt-4 type-display text-3xl text-gold tnum">{boot.goals} goals</div>
        {/if}
      </article>
    </section>
  </div>
{/if}
