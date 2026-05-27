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

  let { state: snapshot, employees } = $props();

  function openEmployee(emp) {
    if (emp) modal.employee(emp.id);
  }
  function openTeam(code) {
    if (store.espnReachable && code && TEAMS[code]) modal.team(code);
  }

  // Brand chip — hides gracefully if the logo file isn't shipped (e.g. fresh
  // clone without the asset, or 404 from CDN).
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
  <header class="p-4">
    <div class="rounded-2xl bg-gradient-to-br from-emerald-500/15 via-pitch-light/60 to-pitch/30 ring-1 ring-emerald-300/20 px-8 py-6 backdrop-blur flex items-center gap-6">
      {#if logoOk}
        <div class="flex-shrink-0 bg-white rounded-lg p-1.5 shadow-md">
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
        <button type="button" class="flex items-center gap-3 group text-left" onclick={() => openEmployee(overallLeader.employee)}>
          <span
            class="w-3 h-12 rounded-full flex-shrink-0 group-hover:scale-110 transition-transform"
            style:background-color={overallLeader.employee.color}
          ></span>
          <span class="text-4xl font-bold leading-none group-hover:underline decoration-2 underline-offset-4">{overallLeader.employee.name}</span>
        </button>
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
          <button type="button" class="flex items-center gap-3 min-w-0 group text-left flex-1" onclick={() => openTeam(worst.row.fifaCode)} disabled={!store.espnReachable}>
            <span class="text-5xl leading-none group-hover:scale-110 transition-transform">{t.flag}</span>
            <div class="min-w-0">
              <div class="text-2xl font-bold leading-tight truncate group-hover:underline decoration-2 underline-offset-4">{t.name}</div>
            </div>
          </button>
        </div>
        {#if worst.owner}
          <button type="button" class="mt-1 inline-flex items-center gap-1.5 group self-start" onclick={() => openEmployee(worst.owner)}>
            <span class="w-2 h-2 rounded-full" style:background-color={worst.owner.color}></span>
            <span class="text-sm font-semibold group-hover:underline" style:color={worst.owner.color}>{worst.owner.name}</span>
          </button>
        {/if}
        <div class="mt-3 text-stone-300 text-sm tabular-nums">
          {worst.row.pts} pts &middot; GD {worst.row.gd >= 0 ? '+' : ''}{worst.row.gd}
        </div>
      {/if}
    </div>

    <!-- Most cards -->
    <div class="rounded-2xl bg-pitch-light/60 ring-1 ring-white/10 p-5 backdrop-blur flex flex-col">
      <div class="text-xs uppercase tracking-widest text-amber-200/80 mb-3">Most cards</div>
      {#if cardsLeader}
        <button type="button" class="flex items-center gap-3 group text-left" onclick={() => openEmployee(cardsLeader.employee)}>
          <span
            class="w-3 h-12 rounded-full flex-shrink-0 group-hover:scale-110 transition-transform"
            style:background-color={cardsLeader.employee.color}
          ></span>
          <span class="text-4xl font-bold leading-none group-hover:underline decoration-2 underline-offset-4">{cardsLeader.employee.name}</span>
        </button>
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
        <button type="button" class="flex items-center gap-3 group text-left" onclick={() => openTeam(boot.team)} disabled={!store.espnReachable}>
          <span class="text-5xl leading-none group-hover:scale-110 transition-transform">{t.flag}</span>
          <div class="min-w-0">
            <div class="text-xl font-bold leading-tight truncate group-hover:underline decoration-2 underline-offset-4">{boot.player}</div>
          </div>
        </button>
        {#if boot.owner}
          <button type="button" class="mt-1 inline-flex items-center gap-1.5 group self-start" onclick={() => openEmployee(boot.owner)}>
            <span class="w-2 h-2 rounded-full" style:background-color={boot.owner.color}></span>
            <span class="text-sm font-semibold group-hover:underline" style:color={boot.owner.color}>{boot.owner.name}</span>
          </button>
        {/if}
        <div class="mt-3 text-stone-300 text-sm tabular-nums">{boot.goals} goals</div>
      {/if}
    </div>
  </header>
{/if}
