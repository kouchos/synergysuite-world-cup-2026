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

  // Inner buttons live inside the clickable prize tiles, so they stop the
  // click from bubbling up and opening the prize standings dialog too.
  function openEmployee(emp, e) {
    e?.stopPropagation();
    if (emp) modal.employee(emp.id);
  }
  function openTeam(code, e) {
    e?.stopPropagation();
    if (store.espnReachable && code && TEAMS[code]) modal.team(code);
  }
  function openPrize(category) {
    modal.prize(category);
  }
  function prizeKeydown(e, category) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      modal.prize(category);
    }
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
        border-volt/30 cursor-pointer lift"
        role="button" tabindex="0" aria-label="Open the full overall standings"
        onclick={() => openPrize('overall')} onkeydown={(e) => prizeKeydown(e, 'overall')}>
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <span class="type-kicker text-volt kicker-slash">Overall leader</span>
          <span class="type-kicker text-fg-faint" aria-hidden="true">table ›</span>
        </div>
        {#if overallLeader}
          <button type="button" class="group flex items-center gap-3 text-left pressable" onclick={(e) => openEmployee(overallLeader.employee, e)}>
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
      <div class="card p-3 sm:p-3.5 flex flex-col cursor-pointer lift"
        role="button" tabindex="0" aria-label="Open the full worst-team table"
        onclick={() => openPrize('worst')} onkeydown={(e) => prizeKeydown(e, 'worst')}>
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="type-kicker text-live/80">Worst team</span>
          <span class="type-kicker text-fg-faint" aria-hidden="true">table ›</span>
        </div>
        {#if worst}
          {@const t = teamFor(worst.row.fifaCode)}
          <button type="button" class="flex items-center gap-2.5 min-w-0 text-left pressable group" onclick={(e) => openTeam(worst.row.fifaCode, e)} disabled={!store.espnReachable}>
            <span class="text-3xl leading-none shrink-0" aria-hidden="true">{t.flag}</span>
            <span class="type-display text-[17px] sm:text-xl leading-[0.95] group-hover:text-live transition-colors">{t.name}</span>
          </button>
          <div class="mt-auto pt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {#if worst.owner}
              <button type="button" class="pressable inline-flex items-center gap-1.5" onclick={(e) => openEmployee(worst.owner, e)}>
                <span class="w-1.5 h-1.5 rounded-full" style:background-color={worst.owner.color} aria-hidden="true"></span>
                <span class="text-xs font-bold" style:color={worst.owner.color}>{worst.owner.name}</span>
              </button>
            {/if}
            <span class="text-fg-mute text-xs tnum type-cond">{worst.row.pts} pts · GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd}</span>
          </div>
        {/if}
      </div>

      <!-- Most cards -->
      <div class="card p-3 sm:p-3.5 flex flex-col cursor-pointer lift"
        role="button" tabindex="0" aria-label="Open the full most-cards standings"
        onclick={() => openPrize('cards')} onkeydown={(e) => prizeKeydown(e, 'cards')}>
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="type-kicker text-gold/90">Most cards</span>
          <span class="type-kicker text-fg-faint" aria-hidden="true">table ›</span>
        </div>
        {#if cardsLeader}
          <button type="button" class="flex items-center gap-2.5 text-left pressable group" onclick={(e) => openEmployee(cardsLeader.employee, e)}>
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
      <div class="card p-3 sm:p-3.5 flex flex-col col-span-2 lg:col-span-1 cursor-pointer lift"
        role="button" tabindex="0" aria-label="Open the full golden boot standings"
        onclick={() => openPrize('boot')} onkeydown={(e) => prizeKeydown(e, 'boot')}>
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="type-kicker text-gold">Golden boot</span>
          <span class="type-kicker text-fg-faint" aria-hidden="true">table ›</span>
        </div>
        {#if boot}
          {@const t = teamFor(boot.team)}
          <button type="button" class="flex items-center gap-2.5 min-w-0 text-left pressable group" onclick={(e) => openTeam(boot.team, e)} disabled={!store.espnReachable}>
            <span class="text-3xl leading-none shrink-0" aria-hidden="true">{t.flag}</span>
            <span class="type-display text-[17px] sm:text-xl leading-[0.95] group-hover:text-gold transition-colors">{boot.player}</span>
          </button>
          <div class="mt-auto pt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {#if boot.owner}
              <button type="button" class="pressable inline-flex items-center gap-1.5" onclick={(e) => openEmployee(boot.owner, e)}>
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
