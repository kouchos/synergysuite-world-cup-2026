<script>
  import { teamFor, TEAMS } from '../../lib/data/teams.js';
  import { formatKickoff } from '../../lib/format.js';
  import { fetchTeam, fetchTeamSchedule, fetchTeamRoster, fetchNews } from '../../lib/data/espn.js';
  import { normaliseNews } from '../../lib/data/adapter.js';
  import { swr } from '../../lib/cache.js';
  import { modal } from '../../lib/state/modal.svelte.js';
  import { store } from '../../lib/state/store.svelte.js';
  import Modal from '../Modal.svelte';
  import PlayerCard from '../PlayerCard.svelte';
  import NewsList from '../NewsList.svelte';

  let { code } = $props();

  const team = $derived(teamFor(code));
  const owner = $derived(store.employees.find((e) => e.teams.some((t) => t.fifaCode === code)) ?? null);
  const pick = $derived(owner?.teams.find((t) => t.fifaCode === code) ?? null);
  const teamRef = $derived(store.state.teamsRef?.[code] ?? null);

  // Their group standing
  const standing = $derived.by(() => {
    for (const g of store.state.groups ?? []) {
      const row = g.standings.find((s) => s.fifaCode === code);
      if (row) return { ...row, groupId: g.id };
    }
    return null;
  });
  const groupMates = $derived.by(() => {
    if (!standing) return [];
    const g = store.state.groups?.find((x) => x.id === standing.groupId);
    return (g?.standings ?? [])
      .filter((s) => s.fifaCode !== code)
      .map((s) => ({ ...s, info: teamFor(s.fifaCode) }));
  });

  // Their fixtures across the tournament
  const teamFixtures = $derived(
    [...(store.state.fixtures ?? []), ...(store.state.knockoutMatches ?? [])]
      .filter((f) => f.home === code || f.away === code)
      .sort((a, b) => new Date(a.utc) - new Date(b.utc)),
  );

  // Lazy ESPN fetch keyed on the team's ESPN id (from teamsRef)
  let teamData = $state(null);
  let scheduleData = $state(null);
  let rosterData = $state(null);
  let loading = $state(false);
  let rosterLoading = $state(false);

  $effect(() => {
    if (!teamRef?.espnId) return;
    loading = true;
    Promise.all([
      swr(`espn:team:${teamRef.espnId}`, () => fetchTeam(teamRef.espnId), 60 * 60 * 1000)
        .then(({ value }) => (teamData = value)),
      swr(`espn:team-schedule:${teamRef.espnId}`, () => fetchTeamSchedule(teamRef.espnId), 30 * 60 * 1000)
        .then(({ value }) => (scheduleData = value)),
    ])
      .catch(() => {})
      .finally(() => (loading = false));
  });

  // Roster is only fetched when the tab is first opened — keeps the modal
  // snappy and avoids a wasted fetch for users who never look at the squad.
  $effect(() => {
    if (activeTab !== 'roster' || rosterData || !teamRef?.espnId) return;
    rosterLoading = true;
    swr(`espn:team-roster:${teamRef.espnId}`, () => fetchTeamRoster(teamRef.espnId), 6 * 60 * 60 * 1000)
      .then(({ value }) => (rosterData = value))
      .catch(() => {})
      .finally(() => (rosterLoading = false));
  });

  // News — same lazy pattern as the roster.
  let newsData = $state(null);
  let newsLoading = $state(false);
  $effect(() => {
    if (activeTab !== 'news' || newsData || !teamRef?.espnId) return;
    newsLoading = true;
    swr(`espn:news:team:${teamRef.espnId}`, () => fetchNews(teamRef.espnId), 10 * 60 * 1000)
      .then(({ value }) => (newsData = value))
      .catch(() => {})
      .finally(() => (newsLoading = false));
  });
  const newsArticles = $derived(newsData ? normaliseNews(newsData) : []);

  // ESPN returns rosters in one of two shapes — flat array or position
  // groups. Normalise to [{ label, players }] for either case.
  function toPlayer(a) {
    return {
      id: a?.id,
      name: a?.displayName ?? a?.fullName ?? a?.shortName ?? a?.name,
      jersey: a?.jersey,
      position: a?.position?.abbreviation ?? a?.position?.name,
      headshot: a?.headshot?.href ?? null,
    };
  }
  const rosterGroups = $derived.by(() => {
    const ath = rosterData?.athletes ?? [];
    if (!ath.length) return [];
    if (ath[0]?.items) {
      // Pre-grouped by ESPN
      return ath.map((g) => ({
        label: g.position ?? g.displayName ?? 'Squad',
        players: (g.items ?? []).map(toPlayer),
      }));
    }
    // Flat — group ourselves
    const byPos = {};
    const order = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    for (const a of ath) {
      const pos = a?.position?.name ?? 'Other';
      byPos[pos] ??= [];
      byPos[pos].push(toPlayer(a));
    }
    return Object.entries(byPos)
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      .map(([label, players]) => ({ label, players }));
  });

  let activeTab = $state('overview');
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'roster', label: 'Squad' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'group', label: 'Group' },
    { id: 'news', label: 'News' },
  ];

  function navigateGame(matchId) {
    if (!store.espnReachable) return;
    modal.game(matchId);
  }
  function navigateTeam(c) {
    if (!store.espnReachable || c === code) return;
    modal.team(c);
  }
  function navigateEmployee(id) {
    modal.employee(id);
  }

  const espnTeam = $derived(teamData?.team ?? null);
  const record = $derived(espnTeam?.record?.items?.[0]?.summary ?? null);
  const recordStats = $derived(espnTeam?.record?.items?.[0]?.stats ?? []);

  const accent = $derived(teamRef?.color ?? '#c8f542');
</script>

<Modal title={team.name} accentColor={accent}>
  <!-- Hero -->
  <section class="card clip-corner p-5 mb-5 flex items-center gap-4 sm:gap-5">
    <div class="text-6xl sm:text-7xl leading-none shrink-0" aria-hidden="true">{team.flag}</div>
    <div class="flex-1 min-w-0">
      <div class="type-kicker text-fg-mute mb-1.5">
        {pick?.topTier ? 'Top-tier pick' : 'Team'}
        {#if standing}<span class="text-fg-faint"> · Group {standing.groupId}</span>{/if}
      </div>
      <div class="type-display text-3xl sm:text-4xl leading-[0.9]">{team.name}</div>
      {#if owner}
        <button
          type="button"
          class="mt-2.5 inline-flex items-center gap-2 pressable"
          onclick={() => navigateEmployee(owner.id)}
        >
          <span class="type-kicker text-fg-faint">Sweepstake owner</span>
          <span class="text-fg-faint" aria-hidden="true">→</span>
          <span class="font-bold px-2.5 py-0.5 rounded text-xs type-cond uppercase tracking-wide"
            style:background="color-mix(in srgb, {owner.color} 16%, transparent)"
            style:border="1px solid color-mix(in srgb, {owner.color} 45%, transparent)"
            style:color={owner.color}>{owner.name}</span>
        </button>
      {/if}
    </div>
    {#if teamRef?.logoUrl}
      <img src={teamRef.logoUrl} alt="" class="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 opacity-85" />
    {/if}
  </section>

  <!-- Tab strip -->
  <nav class="flex gap-1 mb-4 border-b border-line overflow-x-auto">
    {#each tabs as t (t.id)}
      <button
        type="button"
        onclick={() => (activeTab = t.id)}
        class="px-3.5 py-2 type-display text-[13px] border-b-2 transition-colors whitespace-nowrap
          {activeTab === t.id ? 'border-volt text-volt' : 'border-transparent text-fg-faint hover:text-fg-mute'}"
      >{t.label}</button>
    {/each}
  </nav>

  <!-- Tabs body -->
  {#if activeTab === 'overview'}
    <section class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="card-raised p-4">
        <h3 class="type-kicker text-volt kicker-slash mb-3">Group performance</h3>
        {#if standing}
          <div class="grid grid-cols-4 gap-3 text-center">
            <div>
              <div class="type-display text-2xl tnum">{standing.pts}</div>
              <div class="type-kicker text-fg-faint mt-1">Pts</div>
            </div>
            <div>
              <div class="type-display text-2xl tnum">{standing.p}</div>
              <div class="type-kicker text-fg-faint mt-1">P</div>
            </div>
            <div>
              <div class="type-display text-2xl tnum {standing.gd >= 0 ? 'text-volt' : 'text-live'}">{standing.gd >= 0 ? '+' : ''}{standing.gd}</div>
              <div class="type-kicker text-fg-faint mt-1">GD</div>
            </div>
            <div>
              <div class="type-display text-2xl tnum">{standing.gf}</div>
              <div class="type-kicker text-fg-faint mt-1">GF</div>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2 text-center text-sm tnum">
            <div class="bg-ink-4/60 rounded py-1"><span class="text-volt font-bold">{standing.w}W</span></div>
            <div class="bg-ink-4/60 rounded py-1"><span class="text-fg-mute font-bold">{standing.d}D</span></div>
            <div class="bg-ink-4/60 rounded py-1"><span class="text-live font-bold">{standing.l}L</span></div>
          </div>
        {:else}
          <p class="text-fg-faint text-sm">Group stage hasn't started.</p>
        {/if}
      </div>

      <div class="card-raised p-4">
        <h3 class="type-kicker text-volt kicker-slash mb-3">ESPN record</h3>
        {#if loading && !record}
          <p class="text-fg-faint text-sm">Loading…</p>
        {:else if record}
          <div class="type-display text-3xl tnum">{record}</div>
          <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {#each recordStats.slice(0, 6) as stat}
              <div class="flex justify-between border-b border-line/60 py-0.5">
                <span class="text-fg-faint">{stat.shortDisplayName ?? stat.displayName ?? stat.name}</span>
                <span class="tnum font-semibold">{stat.displayValue ?? stat.value}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-fg-faint text-sm">No ESPN record data.</p>
        {/if}
      </div>
    </section>
  {:else if activeTab === 'roster'}
    <section>
      {#if rosterLoading && !rosterData}
        <p class="text-fg-faint text-sm text-center py-6">Loading squad…</p>
      {:else if rosterGroups.length === 0}
        <p class="text-fg-faint text-sm text-center py-6">
          {teamRef?.espnId ? 'No squad data available from ESPN.' : 'ESPN team ID not yet known — try again once a match has been played.'}
        </p>
      {:else}
        <div class="space-y-5">
          {#each rosterGroups as group (group.label)}
            <div>
              <h3 class="type-kicker text-fg-mute kicker-slash mb-2">{group.label} <span class="text-fg-faint font-normal">({group.players.length})</span></h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {#each group.players as p (p.id ?? p.name)}
                  <PlayerCard player={p} />
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {:else if activeTab === 'schedule'}
    <section>
      {#if teamFixtures.length === 0}
        <p class="text-fg-faint text-sm">No fixtures yet.</p>
      {:else}
        <div class="space-y-1.5">
          {#each teamFixtures as m (m.id)}
            {@const ht = TEAMS[m.home] ? teamFor(m.home) : null}
            {@const at = TEAMS[m.away] ? teamFor(m.away) : null}
            <button
              type="button"
              class="w-full text-left card-raised lift px-3 py-2 disabled:cursor-default flex items-center gap-3 text-sm"
              onclick={() => navigateGame(m.id)}
              disabled={!store.espnReachable}
            >
              <span class="w-24 text-xs text-fg-faint tnum type-cond shrink-0">{formatKickoff(m.utc)}</span>
              {#if ht}<span aria-hidden="true">{ht.flag}</span><span class="font-medium truncate w-32 text-right">{ht.name}</span>{:else}<span class="text-fg-faint truncate w-32 text-right">{m.home ?? 'TBD'}</span>{/if}
              <span class="text-center w-16 type-display tnum text-base">
                {#if m.status === 'scheduled'}<span class="type-kicker text-fg-faint not-italic">vs</span>{:else}{m.homeGoals}–{m.awayGoals}{/if}
              </span>
              {#if at}<span class="font-medium truncate w-32">{at.name}</span><span aria-hidden="true">{at.flag}</span>{:else}<span class="text-fg-faint truncate w-32">{m.away ?? 'TBD'}</span>{/if}
              {#if m.status === 'live'}
                <span class="ml-auto text-live text-xs type-display tnum">{m.minute}'</span>
              {:else if m.status === 'final'}
                <span class="ml-auto type-kicker text-fg-faint">FT</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </section>
  {:else if activeTab === 'group'}
    <section>
      {#if standing}
        <div class="card-raised p-4">
          <div class="type-kicker text-volt kicker-slash mb-3">Group {standing.groupId} table</div>
          <table class="w-full text-sm">
            <thead>
              <tr class="type-kicker text-fg-faint text-left">
                <th class="font-[650] pb-2" scope="col">Team</th>
                <th class="font-[650] pb-2 text-right w-8" scope="col">P</th>
                <th class="font-[650] pb-2 text-right w-10" scope="col">GD</th>
                <th class="font-[650] pb-2 text-right w-10" scope="col">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t border-line bg-volt/8">
                <td class="py-2">
                  <span class="inline-flex items-center gap-2"><span aria-hidden="true">{team.flag}</span><span class="font-bold">{team.name}</span></span>
                </td>
                <td class="text-right tnum">{standing.p}</td>
                <td class="text-right tnum">{standing.gd >= 0 ? '+' : ''}{standing.gd}</td>
                <td class="text-right tnum font-bold">{standing.pts}</td>
              </tr>
              {#each groupMates as gm (gm.fifaCode)}
                <tr class="border-t border-line/60">
                  <td class="py-2">
                    <button type="button" class="inline-flex items-center gap-2 pressable hover:text-volt disabled:hover:text-current disabled:cursor-default"
                      onclick={() => navigateTeam(gm.fifaCode)} disabled={!store.espnReachable}>
                      <span aria-hidden="true">{gm.info.flag}</span>
                      <span>{gm.info.name}</span>
                    </button>
                  </td>
                  <td class="text-right tnum">{gm.p}</td>
                  <td class="text-right tnum">{gm.gd >= 0 ? '+' : ''}{gm.gd}</td>
                  <td class="text-right tnum font-bold">{gm.pts}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-fg-faint text-sm">No group data.</p>
      {/if}
    </section>
  {:else if activeTab === 'news'}
    <section>
      {#if newsLoading && !newsData}
        <p class="text-fg-faint text-sm text-center py-6">Loading news…</p>
      {:else if newsArticles.length === 0}
        <p class="text-fg-faint text-sm text-center py-6">
          {teamRef?.espnId
            ? `No recent news for ${team.name}.`
            : 'News feed unavailable — ESPN team ID not yet known.'}
        </p>
      {:else}
        <NewsList articles={newsArticles} />
        <p class="mt-3 text-xs text-fg-faint text-center">Articles open on espn.com in a new tab.</p>
      {/if}
    </section>
  {/if}
</Modal>
