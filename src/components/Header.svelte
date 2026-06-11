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
  import { modal } from '../lib/state/modal.svelte.js';
  import { store } from '../lib/state/store.svelte.js';
  import RaceStrip from './RaceStrip.svelte';

  let { state: snapshot, employees } = $props();

  function openEmployee(emp) {
    if (emp) modal.employee(emp.id);
  }
  function openTeam(code) {
    if (store.espnReachable && code && TEAMS[code]) modal.team(code);
  }

  // Brand chip — hides gracefully if the logo file isn't shipped.
  let logoOk = $state(true);

  const active = $derived(hasMatchActivity(snapshot));
  const overall = $derived(active ? overallLeaderboard(snapshot, employees) : []);
  const worst = $derived(active ? worstTeam(snapshot, employees) : null);
  const cards = $derived(active ? mostCardsLeaderboard(snapshot, employees) : []);
  const boot = $derived(active ? goldenBootLeader(snapshot, employees) : null);

  const overallLeader = $derived(overall[0]);
  const cardsLeader = $derived(cards[0]);

  // For the pre-tournament hero — find the very first real-team match.
  const firstMatch = $derived(
    [...(snapshot.fixtures ?? []), ...(snapshot.knockoutMatches ?? [])]
      .filter((m) => m.utc && TEAMS[m.home] && TEAMS[m.away])
      .sort((a, b) => new Date(a.utc) - new Date(b.utc))[0],
  );
</script>

{#if !active}
  <!-- Pre-tournament hero: no real prize data yet, so don't fake it. -->
  <header class="px-3 sm:px-5 pt-3 pb-2">
    <div class="card clip-corner px-5 sm:px-8 py-5 sm:py-7 flex flex-col sm:flex-row items-start sm:items-center gap-5
      bg-[linear-gradient(120deg,color-mix(in_srgb,var(--color-volt)_9%,var(--color-ink-2)),var(--color-ink-2)_55%)]">
      {#if logoOk}
        <div class="shrink-0 bg-white rounded-lg p-1.5 shadow-md">
          <img
            src={`${import.meta.env.BASE_URL}synergysuite-wc-logo.png`}
            alt="SynergySuite World Cup 2026"
            class="h-14 md:h-16 lg:h-20 w-auto block"
            onerror={() => (logoOk = false)}
          />
        </div>
      {:else}
        <div class="text-5xl">⚽</div>
      {/if}
      <div class="flex-1">
        <div class="type-kicker text-volt kicker-slash mb-2">
          World Cup 2026 — Sweepstake tracker
        </div>
        <div class="type-display text-3xl sm:text-4xl leading-none">
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
          <div class="mt-3 text-fg-mute text-sm sm:text-base flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="type-kicker text-fg-faint">First match</span>
            <span class="text-xl leading-none" aria-hidden="true">{ht.flag}</span>
            <span class="font-bold text-fg">{ht.name}</span>
            <span class="text-fg-faint">vs</span>
            <span class="font-bold text-fg">{at.name}</span>
            <span class="text-xl leading-none" aria-hidden="true">{at.flag}</span>
            {#if until}
              <span class="type-display text-volt text-base">{until}</span>
            {/if}
          </div>
        {/if}
        <div class="mt-2.5 text-fg-faint text-xs">
          Prize tiles will populate once the first ball is kicked.
        </div>
      </div>
    </div>
  </header>
{:else}
  <header class="px-3 sm:px-5 pt-3 pb-2">
    <div class="grid grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr] gap-2">
      <!-- Overall leader — the headline tile -->
      <div class="card clip-corner p-3.5 sm:p-4 col-span-2 lg:col-span-1
        bg-[linear-gradient(125deg,color-mix(in_srgb,var(--color-volt)_11%,var(--color-ink-2)),var(--color-ink-2)_62%)]
        border-volt/30">
        <div class="type-kicker text-volt kicker-slash mb-2.5">Overall leader</div>
        {#if overallLeader}
          <button type="button" class="group flex items-center gap-3 text-left pressable" onclick={() => openEmployee(overallLeader.employee)}>
            <span
              class="w-2 self-stretch rounded-sm shrink-0"
              style:background-color={overallLeader.employee.color}
              aria-hidden="true"
            ></span>
            <span class="type-display text-4xl sm:text-[44px] leading-[0.9] group-hover:text-volt transition-colors">{overallLeader.employee.name}</span>
          </button>
          <div class="mt-2.5 text-fg-mute text-sm tnum type-cond">
            {#key overallLeader.pts}<span class="score-pop font-bold text-fg">{overallLeader.pts} pts</span>{/key}
            &nbsp;·&nbsp; GD {overallLeader.gd >= 0 ? '+' : ''}{overallLeader.gd}
          </div>
        {/if}
      </div>

      <!-- Worst team -->
      <div class="card p-3 sm:p-3.5 flex flex-col">
        <div class="type-kicker text-live/80 mb-2">Worst team</div>
        {#if worst}
          {@const t = teamFor(worst.row.fifaCode)}
          <button type="button" class="flex items-center gap-2.5 min-w-0 text-left pressable group" onclick={() => openTeam(worst.row.fifaCode)} disabled={!store.espnReachable}>
            <span class="text-3xl leading-none shrink-0" aria-hidden="true">{t.flag}</span>
            <span class="type-display text-[17px] sm:text-xl leading-[0.95] group-hover:text-live transition-colors">{t.name}</span>
          </button>
          <div class="mt-auto pt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {#if worst.owner}
              <button type="button" class="pressable inline-flex items-center gap-1.5" onclick={() => openEmployee(worst.owner)}>
                <span class="w-1.5 h-1.5 rounded-full" style:background-color={worst.owner.color} aria-hidden="true"></span>
                <span class="text-xs font-bold" style:color={worst.owner.color}>{worst.owner.name}</span>
              </button>
            {/if}
            <span class="text-fg-mute text-xs tnum type-cond">{worst.row.pts} pts · GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd}</span>
          </div>
        {/if}
      </div>

      <!-- Most cards -->
      <div class="card p-3 sm:p-3.5 flex flex-col">
        <div class="type-kicker text-gold/90 mb-2">Most cards</div>
        {#if cardsLeader}
          <button type="button" class="flex items-center gap-2.5 text-left pressable group" onclick={() => openEmployee(cardsLeader.employee)}>
            <span class="w-1.5 self-stretch rounded-sm shrink-0" style:background-color={cardsLeader.employee.color} aria-hidden="true"></span>
            <span class="type-display text-lg sm:text-xl leading-[0.95] group-hover:text-gold transition-colors">{cardsLeader.employee.name}</span>
          </button>
          <div class="mt-auto pt-2 text-fg-mute text-xs tnum type-cond flex items-center gap-2.5">
            <span class="inline-flex items-center gap-1"><span class="inline-block w-2 h-2.5 rounded-[2px] bg-[#fbbf24]" aria-hidden="true"></span> {cardsLeader.yellow}</span>
            <span class="inline-flex items-center gap-1"><span class="inline-block w-2 h-2.5 rounded-[2px] bg-[#ef4444]" aria-hidden="true"></span> {cardsLeader.red}</span>
            <span class="text-fg-faint">({cardsLeader.points} pts)</span>
          </div>
        {/if}
      </div>

      <!-- Golden boot -->
      <div class="card p-3 sm:p-3.5 flex flex-col col-span-2 lg:col-span-1">
        <div class="type-kicker text-gold mb-2">Golden boot</div>
        {#if boot}
          {@const t = teamFor(boot.team)}
          <button type="button" class="flex items-center gap-2.5 min-w-0 text-left pressable group" onclick={() => openTeam(boot.team)} disabled={!store.espnReachable}>
            <span class="text-3xl leading-none shrink-0" aria-hidden="true">{t.flag}</span>
            <span class="type-display text-[17px] sm:text-xl leading-[0.95] group-hover:text-gold transition-colors">{boot.player}</span>
          </button>
          <div class="mt-auto pt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {#if boot.owner}
              <button type="button" class="pressable inline-flex items-center gap-1.5" onclick={() => openEmployee(boot.owner)}>
                <span class="w-1.5 h-1.5 rounded-full" style:background-color={boot.owner.color} aria-hidden="true"></span>
                <span class="text-xs font-bold" style:color={boot.owner.color}>{boot.owner.name}</span>
              </button>
            {/if}
            <span class="text-fg-mute text-xs tnum type-cond">{#key boot.goals}<span class="score-pop">{boot.goals} goals</span>{/key}</span>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <RaceStrip state={snapshot} {employees} />
{/if}
