<script>
  import { teamFor, TEAMS } from '../../lib/data/teams.js';
  import {
    overallLeaderboard,
    worstTeam,
    mostCardsLeaderboard,
    goldenBootLeader,
  } from '../../lib/state/prizes.js';
  import { modal } from '../../lib/state/modal.svelte.js';
  import { store } from '../../lib/state/store.svelte.js';
  import Modal from '../Modal.svelte';
  import { formatKickoff } from '../../lib/format.js';

  let { employeeId } = $props();

  const employee = $derived(store.employees.find((e) => e.id === employeeId));
  const state = $derived(store.state);

  // Where this employee ranks
  const overall = $derived(overallLeaderboard(state, store.employees));
  const cards = $derived(mostCardsLeaderboard(state, store.employees));
  const overallRank = $derived(overall.findIndex((e) => e.employee.id === employeeId) + 1);
  const cardsRank = $derived(cards.findIndex((e) => e.employee.id === employeeId) + 1);
  const overallRow = $derived(overall.find((e) => e.employee.id === employeeId));
  const cardsRow = $derived(cards.find((e) => e.employee.id === employeeId));
  const worst = $derived(worstTeam(state, store.employees));
  const boot = $derived(goldenBootLeader(state, store.employees));

  // Per-team stats for this employee's 6 teams
  function standingFor(code) {
    for (const g of state.groups ?? []) {
      const row = g.standings.find((s) => s.fifaCode === code);
      if (row) return { ...row, groupId: g.id };
    }
    return null;
  }

  const ownedTeams = $derived(
    employee?.teams.map((t) => ({
      ...t,
      info: teamFor(t.fifaCode),
      standing: standingFor(t.fifaCode),
    })) ?? [],
  );

  // Sorted "best in each prize category" for THIS employee
  const ownedSorted = $derived(
    [...ownedTeams].filter((t) => t.standing).sort((a, b) =>
      (b.standing?.pts ?? 0) - (a.standing?.pts ?? 0) ||
      (b.standing?.gd ?? 0) - (a.standing?.gd ?? 0),
    ),
  );
  const bestOverall = $derived(ownedSorted[0]);
  const worstOwned = $derived(
    [...ownedTeams].filter((t) => t.standing).sort((a, b) =>
      (a.standing?.pts ?? 0) - (b.standing?.pts ?? 0) ||
      (a.standing?.gd ?? 0) - (b.standing?.gd ?? 0),
    )[0],
  );

  // Card tally per owned team (for "card leader" within their picks) —
  // group + knockout, same scope as mostCardsLeaderboard.
  const cardsByTeam = $derived.by(() => {
    const tally = {};
    for (const fx of [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])]) {
      for (const ev of fx.events ?? []) {
        if (ev.type === 'yellow' || ev.type === 'red') {
          tally[ev.team] ??= { yellow: 0, red: 0 };
          tally[ev.team][ev.type] += 1;
        }
      }
    }
    return tally;
  });
  const cardLeaderTeam = $derived.by(() => {
    let best = null;
    let bestPts = -1;
    for (const t of ownedTeams) {
      const c = cardsByTeam[t.fifaCode];
      if (!c) continue;
      const pts = c.yellow + c.red * 2;
      if (pts > bestPts) {
        bestPts = pts;
        best = { team: t, ...c, points: pts };
      }
    }
    return best;
  });

  // Top scorer from this employee's teams
  const bootContender = $derived.by(() => {
    return (state.topScorers ?? []).find((s) =>
      employee?.teams.some((t) => t.fifaCode === s.team),
    );
  });

  // Their teams' fixtures
  const ownedCodes = $derived(new Set(employee?.teams.map((t) => t.fifaCode) ?? []));
  const ownedFixtures = $derived(
    [...(state.fixtures ?? []), ...(state.knockoutMatches ?? [])]
      .filter((f) => ownedCodes.has(f.home) || ownedCodes.has(f.away))
      .sort((a, b) => new Date(a.utc) - new Date(b.utc)),
  );
  const recentFixtures = $derived(
    ownedFixtures.filter((f) => f.status === 'final' || f.status === 'live').slice(-5),
  );
  const upcomingFixtures = $derived(
    ownedFixtures.filter((f) => f.status === 'scheduled').slice(0, 5),
  );

  function ord(n) {
    if (!n) return '—';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function navigateTeam(code) {
    if (!store.espnReachable) return;
    modal.team(code);
  }
  function navigateGame(matchId) {
    if (!store.espnReachable) return;
    modal.game(matchId);
  }
</script>

{#if employee}
  <Modal title={employee.name} accentColor={employee.color}>
    <!-- Hero -->
    <section class="card clip-corner p-5 mb-5 flex items-center gap-5"
      style:background="linear-gradient(135deg, color-mix(in srgb, {employee.color} 16%, var(--color-ink-2)), var(--color-ink-2) 65%)">
      <div
        class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center type-display text-3xl sm:text-4xl shadow-lg shrink-0 text-ink"
        style:background-color={employee.color}
      >
        {employee.name[0]}
      </div>
      <div class="min-w-0">
        <div class="type-kicker text-fg-mute mb-1.5">Sweepstake player</div>
        <div class="type-display text-3xl sm:text-4xl leading-[0.9]">{employee.name}</div>
        {#if overallRow}
          <div class="mt-2 text-fg-mute text-sm tnum type-cond">
            {overallRow.pts} pts · GD {overallRow.gd >= 0 ? '+' : ''}{overallRow.gd} ·
            <span class="text-volt font-bold">{ord(overallRank)} place overall</span>
          </div>
        {/if}
      </div>
    </section>

    <!-- Prize positions -->
    <section class="mb-5">
      <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Prize positions</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div class="card-raised p-3.5">
          <div class="type-kicker text-volt">Overall</div>
          <div class="type-display text-2xl tnum mt-1.5">{ord(overallRank)}</div>
          {#if bestOverall}
            <button type="button" class="mt-2 inline-flex items-center gap-1.5 text-sm pressable text-fg-mute hover:text-fg" onclick={() => navigateTeam(bestOverall.fifaCode)} disabled={!store.espnReachable}>
              <span aria-hidden="true">{bestOverall.info.flag}</span>
              <span>{bestOverall.info.name}</span>
            </button>
          {/if}
        </div>

        <div class="card-raised p-3.5">
          <div class="type-kicker text-live/90">Worst team</div>
          {#if worst && worst.owner?.id === employeeId}
            <div class="type-display text-2xl mt-1.5 text-live">🥄</div>
            <div class="text-xs text-fg-faint mt-1">Currently leading</div>
          {:else}
            <div class="type-display text-2xl tnum mt-1.5 text-fg-faint">—</div>
          {/if}
          {#if worstOwned}
            <button type="button" class="mt-2 inline-flex items-center gap-1.5 text-sm pressable text-fg-mute hover:text-fg" onclick={() => navigateTeam(worstOwned.fifaCode)} disabled={!store.espnReachable}>
              <span aria-hidden="true">{worstOwned.info.flag}</span>
              <span>{worstOwned.info.name}</span>
            </button>
          {/if}
        </div>

        <div class="card-raised p-3.5">
          <div class="type-kicker text-gold/90">Most cards</div>
          <div class="type-display text-2xl tnum mt-1.5">{ord(cardsRank)}</div>
          {#if cardsRow}
            <div class="text-xs text-fg-faint mt-1 tnum">{cardsRow.points} pts</div>
          {/if}
          {#if cardLeaderTeam}
            <button type="button" class="mt-2 inline-flex items-center gap-1.5 text-sm pressable text-fg-mute hover:text-fg" onclick={() => navigateTeam(cardLeaderTeam.team.fifaCode)} disabled={!store.espnReachable}>
              <span aria-hidden="true">{cardLeaderTeam.team.info.flag}</span>
              <span>{cardLeaderTeam.team.info.name}</span>
            </button>
          {/if}
        </div>

        <div class="card-raised p-3.5">
          <div class="type-kicker text-gold">Golden boot</div>
          {#if boot && boot.owner?.id === employeeId}
            <div class="type-display text-2xl mt-1.5 text-gold">👟</div>
            <div class="text-xs text-fg-faint mt-1">Currently leading</div>
          {:else}
            <div class="type-display text-2xl tnum mt-1.5 text-fg-faint">—</div>
          {/if}
          {#if bootContender}
            {@const t = teamFor(bootContender.team)}
            <button type="button" class="mt-2 inline-flex items-center gap-1.5 text-sm pressable text-fg-mute hover:text-fg text-left" onclick={() => navigateTeam(bootContender.team)} disabled={!store.espnReachable}>
              <span aria-hidden="true">{t.flag}</span>
              <span>{bootContender.player} ({bootContender.goals})</span>
            </button>
          {/if}
        </div>
      </div>
    </section>

    <!-- Owned teams -->
    <section class="mb-5">
      <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Their six picks</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {#each ownedTeams as t (t.fifaCode)}
          <button
            type="button"
            class="card-raised lift p-3 flex items-center gap-3 text-left disabled:cursor-default"
            onclick={() => navigateTeam(t.fifaCode)}
            disabled={!store.espnReachable}
          >
            <span class="text-2xl" aria-hidden="true">{t.info.flag}</span>
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate text-sm">
                {t.info.name}
                {#if t.topTier}<span class="text-gold ml-1" title="Top tier">★</span>{/if}
              </div>
              {#if t.standing}
                <div class="text-xs text-fg-faint tnum type-cond">
                  Group {t.standing.groupId} · {t.standing.pts} pts · GD {t.standing.gd >= 0 ? '+' : ''}{t.standing.gd}
                </div>
              {:else}
                <div class="text-xs text-fg-faint/70">no group data</div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </section>

    <!-- Fixtures -->
    {#if recentFixtures.length || upcomingFixtures.length}
      <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#if recentFixtures.length}
          <div>
            <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Recent results</h3>
            <div class="space-y-2">
              {#each recentFixtures as m (m.id)}
                {@const ht = teamFor(m.home)}
                {@const at = teamFor(m.away)}
                <button type="button" class="w-full text-left card-raised lift px-3 py-2 disabled:cursor-default flex items-center gap-2 text-sm"
                  onclick={() => navigateGame(m.id)} disabled={!store.espnReachable}>
                  <span aria-hidden="true">{ht.flag}</span>
                  <span class="font-medium truncate flex-1">{ht.name}</span>
                  <span class="type-display tnum text-base">{m.homeGoals}–{m.awayGoals}</span>
                  <span class="font-medium truncate flex-1 text-right">{at.name}</span>
                  <span aria-hidden="true">{at.flag}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#if upcomingFixtures.length}
          <div>
            <h3 class="type-kicker text-volt kicker-slash mb-3">Upcoming</h3>
            <div class="space-y-2">
              {#each upcomingFixtures as m (m.id)}
                {@const ht = TEAMS[m.home] ? teamFor(m.home) : null}
                {@const at = TEAMS[m.away] ? teamFor(m.away) : null}
                <button type="button" class="w-full text-left card-raised lift px-3 py-2 disabled:cursor-default flex items-center gap-2 text-sm"
                  onclick={() => navigateGame(m.id)} disabled={!store.espnReachable}>
                  {#if ht}<span aria-hidden="true">{ht.flag}</span><span class="font-medium truncate flex-1">{ht.name}</span>{:else}<span class="text-fg-faint flex-1">{m.home ?? 'TBD'}</span>{/if}
                  <span class="text-xs text-fg-faint tnum type-cond">{formatKickoff(m.utc)}</span>
                  {#if at}<span class="font-medium truncate flex-1 text-right">{at.name}</span><span aria-hidden="true">{at.flag}</span>{:else}<span class="text-fg-faint flex-1 text-right">{m.away ?? 'TBD'}</span>{/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </section>
    {/if}

    {#if !store.espnReachable}
      <p class="mt-6 text-xs text-fg-faint text-center">
        Team and game drill-down disabled — ESPN data not available right now.
      </p>
    {/if}
  </Modal>
{/if}
