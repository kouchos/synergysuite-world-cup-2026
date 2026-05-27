<script>
  import { teamFor, TEAMS } from '../../lib/data/teams.js';
  import { formatKickoff } from '../../lib/format.js';
  import { fetchTeam, fetchTeamSchedule } from '../../lib/data/espn.js';
  import { swr } from '../../lib/cache.js';
  import { modal } from '../../lib/state/modal.svelte.js';
  import { store } from '../../lib/state/store.svelte.js';
  import Modal from '../Modal.svelte';

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
  let loading = $state(false);

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

  let activeTab = $state('overview');
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'group', label: 'Group' },
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
  const nextEvent = $derived(espnTeam?.nextEvent?.[0] ?? null);

  const accent = $derived(teamRef?.color ?? '#10b981');
</script>

<Modal title={team.name} accentColor={accent}>
  <!-- Hero -->
  <section class="rounded-2xl bg-pitch/40 ring-1 ring-white/5 p-6 mb-5 flex items-center gap-5">
    <div class="text-8xl leading-none flex-shrink-0">{team.flag}</div>
    <div class="flex-1 min-w-0">
      <div class="text-stone-300 text-xs uppercase tracking-widest font-bold mb-1">
        {pick?.topTier ? 'Top-tier pick' : 'Team'}
        {#if standing}<span class="text-stone-500"> · Group {standing.groupId}</span>{/if}
      </div>
      <div class="text-4xl font-bold leading-tight">{team.name}</div>
      {#if owner}
        <button
          type="button"
          class="mt-2 inline-flex items-center gap-2 group"
          onclick={() => navigateEmployee(owner.id)}
        >
          <span class="text-stone-400 text-sm">Sweepstake owner</span>
          <span class="text-stone-500">→</span>
          <span class="font-semibold px-3 py-1 rounded-full text-white group-hover:ring-2 group-hover:ring-white/40"
            style:background-color={owner.color}>{owner.name}</span>
        </button>
      {/if}
    </div>
    {#if teamRef?.logoUrl}
      <img src={teamRef.logoUrl} alt="" class="w-20 h-20 object-contain flex-shrink-0 opacity-80" />
    {/if}
  </section>

  <!-- Tab strip -->
  <nav class="flex gap-2 mb-4 border-b border-white/10">
    {#each tabs as t (t.id)}
      <button
        type="button"
        onclick={() => (activeTab = t.id)}
        class="px-4 py-2 text-sm font-semibold border-b-2 transition-colors
          {activeTab === t.id ? 'border-emerald-400 text-emerald-200' : 'border-transparent text-stone-400 hover:text-stone-200'}"
      >{t.label}</button>
    {/each}
  </nav>

  <!-- Tabs body -->
  {#if activeTab === 'overview'}
    <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-xl bg-pitch/40 ring-1 ring-white/5 p-4">
        <h3 class="text-xs uppercase tracking-widest text-emerald-200/80 font-bold mb-3">Group performance</h3>
        {#if standing}
          <div class="grid grid-cols-4 gap-3 text-center">
            <div>
              <div class="text-2xl font-bold tabular-nums">{standing.pts}</div>
              <div class="text-xs text-stone-400 uppercase">Pts</div>
            </div>
            <div>
              <div class="text-2xl font-bold tabular-nums">{standing.p}</div>
              <div class="text-xs text-stone-400 uppercase">P</div>
            </div>
            <div>
              <div class="text-2xl font-bold tabular-nums {standing.gd >= 0 ? 'text-emerald-200' : 'text-rose-200'}">{standing.gd >= 0 ? '+' : ''}{standing.gd}</div>
              <div class="text-xs text-stone-400 uppercase">GD</div>
            </div>
            <div>
              <div class="text-2xl font-bold tabular-nums">{standing.gf}</div>
              <div class="text-xs text-stone-400 uppercase">GF</div>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2 text-center text-sm tabular-nums">
            <div class="bg-pitch-light/30 rounded py-1"><span class="text-emerald-300 font-bold">{standing.w}W</span></div>
            <div class="bg-pitch-light/30 rounded py-1"><span class="text-stone-300 font-bold">{standing.d}D</span></div>
            <div class="bg-pitch-light/30 rounded py-1"><span class="text-rose-300 font-bold">{standing.l}L</span></div>
          </div>
        {:else}
          <p class="text-stone-400 italic text-sm">Group stage hasn't started.</p>
        {/if}
      </div>

      <div class="rounded-xl bg-pitch/40 ring-1 ring-white/5 p-4">
        <h3 class="text-xs uppercase tracking-widest text-emerald-200/80 font-bold mb-3">ESPN record</h3>
        {#if loading && !record}
          <p class="text-stone-400 italic text-sm">Loading…</p>
        {:else if record}
          <div class="text-3xl font-bold tabular-nums">{record}</div>
          <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {#each recordStats.slice(0, 6) as stat}
              <div class="flex justify-between border-b border-white/5 py-0.5">
                <span class="text-stone-400">{stat.shortDisplayName ?? stat.displayName ?? stat.name}</span>
                <span class="tabular-nums font-semibold">{stat.displayValue ?? stat.value}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-stone-400 italic text-sm">No ESPN record data.</p>
        {/if}
      </div>
    </section>
  {:else if activeTab === 'schedule'}
    <section>
      {#if teamFixtures.length === 0}
        <p class="text-stone-400 italic text-sm">No fixtures yet.</p>
      {:else}
        <div class="space-y-1.5">
          {#each teamFixtures as m (m.id)}
            {@const ht = TEAMS[m.home] ? teamFor(m.home) : null}
            {@const at = TEAMS[m.away] ? teamFor(m.away) : null}
            <button
              type="button"
              class="w-full text-left rounded-lg bg-pitch/40 ring-1 ring-white/5 px-3 py-2 hover:bg-pitch/60 hover:ring-white/20 disabled:hover:bg-pitch/40 disabled:cursor-default transition-colors flex items-center gap-3 text-sm"
              onclick={() => navigateGame(m.id)}
              disabled={!store.espnReachable}
            >
              <span class="w-24 text-xs text-stone-400 tabular-nums flex-shrink-0">{formatKickoff(m.utc)}</span>
              {#if ht}<span>{ht.flag}</span><span class="font-medium truncate w-32 text-right">{ht.name}</span>{:else}<span class="text-stone-500 italic truncate w-32 text-right">{m.home ?? 'TBD'}</span>{/if}
              <span class="text-center w-16 font-bold tabular-nums">
                {#if m.status === 'scheduled'}vs{:else}{m.homeGoals}–{m.awayGoals}{/if}
              </span>
              {#if at}<span class="font-medium truncate w-32">{at.name}</span><span>{at.flag}</span>{:else}<span class="text-stone-500 italic truncate w-32">{m.away ?? 'TBD'}</span>{/if}
              {#if m.status === 'live'}
                <span class="ml-auto text-rose-300 text-xs font-bold tabular-nums">{m.minute}'</span>
              {:else if m.status === 'final'}
                <span class="ml-auto text-stone-400 text-xs">FT</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </section>
  {:else if activeTab === 'group'}
    <section>
      {#if standing}
        <div class="rounded-xl bg-pitch/40 ring-1 ring-white/5 p-4">
          <div class="text-xs uppercase tracking-widest text-emerald-200/80 font-bold mb-3">Group {standing.groupId} table</div>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-stone-400 text-left">
                <th class="font-medium pb-2">Team</th>
                <th class="font-medium pb-2 text-right w-8">P</th>
                <th class="font-medium pb-2 text-right w-10">GD</th>
                <th class="font-medium pb-2 text-right w-10">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t border-white/5 bg-emerald-400/10">
                <td class="py-2">
                  <span class="inline-flex items-center gap-2"><span>{team.flag}</span><span class="font-bold">{team.name}</span></span>
                </td>
                <td class="text-right tabular-nums">{standing.p}</td>
                <td class="text-right tabular-nums">{standing.gd >= 0 ? '+' : ''}{standing.gd}</td>
                <td class="text-right tabular-nums font-bold">{standing.pts}</td>
              </tr>
              {#each groupMates as gm (gm.fifaCode)}
                <tr class="border-t border-white/5">
                  <td class="py-2">
                    <button type="button" class="inline-flex items-center gap-2 hover:text-emerald-200 disabled:hover:text-current disabled:cursor-default"
                      onclick={() => navigateTeam(gm.fifaCode)} disabled={!store.espnReachable}>
                      <span>{gm.info.flag}</span>
                      <span>{gm.info.name}</span>
                    </button>
                  </td>
                  <td class="text-right tabular-nums">{gm.p}</td>
                  <td class="text-right tabular-nums">{gm.gd >= 0 ? '+' : ''}{gm.gd}</td>
                  <td class="text-right tabular-nums font-bold">{gm.pts}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-stone-400 italic text-sm">No group data.</p>
      {/if}
    </section>
  {/if}
</Modal>
