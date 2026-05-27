<script>
  import { teamFor, TEAMS } from '../../lib/data/teams.js';
  import { formatKickoff } from '../../lib/format.js';
  import { fetchSummary } from '../../lib/data/espn.js';
  import { swr } from '../../lib/cache.js';
  import { modal } from '../../lib/state/modal.svelte.js';
  import { store } from '../../lib/state/store.svelte.js';
  import Modal from '../Modal.svelte';

  let { matchId } = $props();

  // Pull the match from current state — gives us baseline metadata.
  const match = $derived.by(() => {
    const all = [
      ...(store.state.fixtures ?? []),
      ...(store.state.knockoutMatches ?? []),
    ];
    return all.find((m) => m.id === matchId);
  });

  const home = $derived(match?.home && TEAMS[match.home] ? teamFor(match.home) : null);
  const away = $derived(match?.away && TEAMS[match.away] ? teamFor(match.away) : null);

  function ownerOf(code) {
    if (!code) return null;
    return store.employees.find((e) => e.teams.some((t) => t.fifaCode === code)) ?? null;
  }
  const homeOwner = $derived(ownerOf(match?.home));
  const awayOwner = $derived(ownerOf(match?.away));

  const isLive = $derived(match?.status === 'live');
  const isFinal = $derived(match?.status === 'final');
  const isScheduled = $derived(match?.status === 'scheduled');

  // Fetch the ESPN summary on demand. Cache short for live, longer otherwise.
  let summary = $state(null);
  let summaryLoading = $state(false);
  let summaryError = $state(null);

  // Only attempt the fetch when the match id looks like an ESPN id (numeric).
  // Openfootball baseline ids start with 'of-'.
  const fetchable = $derived(match?.id && !String(match.id).startsWith('of-'));

  $effect(() => {
    if (!fetchable) return;
    summaryLoading = true;
    summaryError = null;
    const ttl = isLive ? 30_000 : 24 * 60 * 60 * 1000;
    swr(`espn:summary:${match.id}`, () => fetchSummary(match.id), ttl)
      .then(({ value, error }) => {
        if (value) summary = value;
        if (error && !value) summaryError = error;
      })
      .catch((e) => (summaryError = e))
      .finally(() => (summaryLoading = false));
  });

  // Sort match events chronologically
  const matchEvents = $derived([...(match?.events ?? [])].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0)));

  const venue = $derived(match?.venue ?? summary?.gameInfo?.venue?.fullName ?? null);
  const broadcasts = $derived(summary?.header?.competitions?.[0]?.broadcasts ?? []);

  // Header.competitions[0].competitors for ESPN-side score detail
  const espnComp = $derived(summary?.header?.competitions?.[0]);
  const espnHome = $derived(espnComp?.competitors?.find((c) => c.homeAway === 'home'));
  const espnAway = $derived(espnComp?.competitors?.find((c) => c.homeAway === 'away'));

  function navigateTeam(code) {
    if (!store.espnReachable) return;
    modal.team(code);
  }

  const accent = $derived(isLive ? '#f43f5e' : isFinal ? '#10b981' : '#0ea5e9');
  const title = $derived(isLive ? 'Live match' : isFinal ? 'Match report' : 'Match preview');
</script>

{#if match}
  <Modal {title} accentColor={accent}>
    <!-- Hero: home crest score away crest -->
    <section class="rounded-2xl bg-pitch/40 ring-1 ring-white/5 p-6 mb-5">
      <div class="flex items-center justify-between gap-4">
        <!-- Home -->
        <button
          type="button"
          class="flex flex-col items-center gap-2 flex-1 hover:opacity-90 disabled:opacity-100 disabled:cursor-default"
          onclick={() => match.home && navigateTeam(match.home)}
          disabled={!store.espnReachable || !home}
        >
          {#if home}
            <span class="text-7xl leading-none">{home.flag}</span>
            <span class="text-xl font-bold">{home.name}</span>
            {#if homeOwner}
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style:background-color={homeOwner.color}>
                {homeOwner.name}
              </span>
            {/if}
          {:else}
            <span class="text-stone-400 italic">{match.home ?? 'TBD'}</span>
          {/if}
        </button>

        <!-- Score / kickoff -->
        <div class="text-center px-2 min-w-[140px]">
          {#if isScheduled}
            <div class="text-stone-300 text-sm">{formatKickoff(match.utc)}</div>
            <div class="text-xs text-stone-400 mt-1 uppercase tracking-widest">Kickoff</div>
          {:else}
            <div class="text-5xl font-black tabular-nums">
              {match.homeGoals ?? '–'}<span class="text-stone-500 mx-2">–</span>{match.awayGoals ?? '–'}
            </div>
            {#if isLive}
              <div class="mt-2 inline-flex items-center gap-1.5 text-rose-300 text-sm font-bold uppercase tracking-widest">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400 live-dot"></span>
                Live · {match.minute}'
              </div>
            {:else}
              <div class="mt-2 text-stone-400 text-xs uppercase tracking-widest">Full time</div>
            {/if}
          {/if}
        </div>

        <!-- Away -->
        <button
          type="button"
          class="flex flex-col items-center gap-2 flex-1 hover:opacity-90 disabled:opacity-100 disabled:cursor-default"
          onclick={() => match.away && navigateTeam(match.away)}
          disabled={!store.espnReachable || !away}
        >
          {#if away}
            <span class="text-7xl leading-none">{away.flag}</span>
            <span class="text-xl font-bold">{away.name}</span>
            {#if awayOwner}
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full" style:background-color={awayOwner.color}>
                {awayOwner.name}
              </span>
            {/if}
          {:else}
            <span class="text-stone-400 italic">{match.away ?? 'TBD'}</span>
          {/if}
        </button>
      </div>

      {#if venue}
        <div class="mt-4 text-center text-xs text-stone-400">📍 {venue}</div>
      {/if}
      {#if broadcasts.length > 0}
        <div class="mt-1 text-center text-xs text-stone-400">
          📺 {broadcasts.flatMap((b) => b.names ?? b.market ? [b.market] : []).join(' · ') || broadcasts.map((b) => b.media?.shortName).filter(Boolean).join(' · ')}
        </div>
      {/if}
    </section>

    <!-- Events timeline (goals + cards) -->
    {#if matchEvents.length > 0}
      <section class="mb-5">
        <h3 class="text-sm font-bold uppercase tracking-widest text-emerald-200/80 mb-3">Key events</h3>
        <div class="space-y-1.5">
          {#each matchEvents as ev (`${ev.minute}-${ev.player}-${ev.type}`)}
            {@const onHome = ev.team === match.home}
            <div class="flex items-center gap-3 text-sm">
              <span class="w-12 text-right text-stone-400 tabular-nums font-mono">{ev.minute}'</span>
              <span class="w-8 text-center">
                {#if ev.type === 'goal'}⚽
                {:else if ev.type === 'yellow'}🟨
                {:else if ev.type === 'red'}🟥
                {/if}
              </span>
              <span class="flex-1 {onHome ? 'text-left' : 'text-right'}">
                <span class="font-semibold">{ev.player}</span>
                <span class="text-stone-400 ml-2">({TEAMS[ev.team]?.name ?? ev.team})</span>
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ESPN-fetched extras -->
    {#if summaryLoading}
      <div class="text-center text-stone-400 text-sm italic py-4">Loading match details…</div>
    {:else if summary}
      {#if espnHome?.statistics?.length || espnAway?.statistics?.length}
        <section class="mb-5">
          <h3 class="text-sm font-bold uppercase tracking-widest text-emerald-200/80 mb-3">Team stats</h3>
          <div class="rounded-xl bg-pitch/40 ring-1 ring-white/5 overflow-hidden">
            {#each (espnHome?.statistics ?? []) as stat, i}
              {@const away = espnAway?.statistics?.[i]}
              <div class="grid grid-cols-3 items-center px-4 py-1.5 text-sm border-b border-white/5 last:border-0">
                <span class="text-right tabular-nums font-semibold">{stat.displayValue}</span>
                <span class="text-center text-xs text-stone-300 uppercase tracking-wider">{stat.label ?? stat.name}</span>
                <span class="text-left tabular-nums font-semibold">{away?.displayValue ?? '—'}</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if summary?.article?.headline || summary?.notes?.length}
        <section>
          <h3 class="text-sm font-bold uppercase tracking-widest text-emerald-200/80 mb-3">Notes</h3>
          {#if summary?.article?.headline}
            <p class="text-stone-200 mb-2 font-semibold">{summary.article.headline}</p>
          {/if}
          {#if summary?.article?.description}
            <p class="text-stone-300 text-sm">{summary.article.description}</p>
          {/if}
        </section>
      {/if}
    {:else if !fetchable}
      <p class="text-center text-stone-400 text-sm italic py-4">No ESPN match id available for this fixture.</p>
    {:else if summaryError}
      <p class="text-center text-rose-300/80 text-sm italic py-4">Couldn't load full match details from ESPN.</p>
    {/if}
  </Modal>
{/if}
