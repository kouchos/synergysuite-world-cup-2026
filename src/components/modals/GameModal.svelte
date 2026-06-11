<script>
  import { teamFor, TEAMS } from '../../lib/data/teams.js';
  import { formatKickoff } from '../../lib/format.js';
  import { fetchSummary } from '../../lib/data/espn.js';
  import { swr } from '../../lib/cache.js';
  import { modal } from '../../lib/state/modal.svelte.js';
  import { store } from '../../lib/state/store.svelte.js';
  import Modal from '../Modal.svelte';
  import PlayerCard from '../PlayerCard.svelte';

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
  // Openfootball baseline ids start with 'of-', mock fixtures with 'mock-'/'r16-'
  // etc — hitting ESPN with those just produces console noise.
  const fetchable = $derived(match?.id && /^\d+$/.test(String(match.id)));

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

  // Parse rosters (lineups + bench) from the summary response.
  function toPlayer(entry) {
    const a = entry?.athlete ?? entry;
    return {
      id: a?.id,
      name: a?.displayName ?? a?.shortName ?? a?.fullName,
      jersey: entry?.jersey ?? a?.jersey,
      position: a?.position?.abbreviation ?? entry?.position?.abbreviation,
      headshot: a?.headshot?.href ?? null,
      starter: entry?.starter ?? false,
      subbedIn: entry?.subbedIn ?? null,
      subbedOut: entry?.subbedOut ?? null,
    };
  }
  const lineups = $derived.by(() => {
    const result = {
      home: { starters: [], bench: [] },
      away: { starters: [], bench: [] },
    };
    for (const r of summary?.rosters ?? []) {
      const side = r?.homeAway === 'home' ? 'home' : r?.homeAway === 'away' ? 'away' : null;
      if (!side) continue;
      for (const entry of r.roster ?? []) {
        const p = toPlayer(entry);
        if (p.starter) result[side].starters.push(p);
        else result[side].bench.push(p);
      }
    }
    return result;
  });
  const hasLineups = $derived(
    lineups.home.starters.length > 0 || lineups.away.starters.length > 0,
  );

  function navigateTeam(code) {
    if (!store.espnReachable) return;
    modal.team(code);
  }

  const accent = $derived(isLive ? '#ff4d5d' : isFinal ? '#c8f542' : '#4d94ff');
  const title = $derived(isLive ? 'Live match' : isFinal ? 'Match report' : 'Match preview');
</script>

{#if match}
  <Modal {title} accentColor={accent}>
    <!-- Hero: home crest score away crest -->
    <section class="card clip-corner p-5 sm:p-6 mb-5">
      <div class="flex items-center justify-between gap-2 sm:gap-4">
        <!-- Home -->
        <button
          type="button"
          class="flex flex-col items-center gap-2 flex-1 min-w-0 pressable disabled:cursor-default"
          onclick={() => match.home && navigateTeam(match.home)}
          disabled={!store.espnReachable || !home}
        >
          {#if home}
            <span class="text-5xl sm:text-7xl leading-none" aria-hidden="true">{home.flag}</span>
            <span class="type-display text-base sm:text-xl text-center leading-[0.95]">{home.name}</span>
            {#if homeOwner}
              <span class="text-[11px] font-bold px-2 py-0.5 rounded type-cond uppercase tracking-wide"
                style:background="color-mix(in srgb, {homeOwner.color} 16%, transparent)"
                style:border="1px solid color-mix(in srgb, {homeOwner.color} 45%, transparent)"
                style:color={homeOwner.color}>
                {homeOwner.name}
              </span>
            {/if}
          {:else}
            <span class="text-fg-faint">{match.home ?? 'TBD'}</span>
          {/if}
        </button>

        <!-- Score / kickoff -->
        <div class="text-center px-1 sm:px-2 min-w-[110px] sm:min-w-[140px]">
          {#if isScheduled}
            <div class="text-fg-mute text-sm type-cond">{formatKickoff(match.utc)}</div>
            <div class="type-kicker text-fg-faint mt-1.5">Kickoff</div>
          {:else}
            {#key `${match.homeGoals}-${match.awayGoals}`}
              <div class="score-pop type-display text-4xl sm:text-5xl tnum">
                {match.homeGoals ?? '–'}<span class="text-fg-faint mx-1.5 not-italic">–</span>{match.awayGoals ?? '–'}
              </div>
            {/key}
            {#if isLive}
              <div class="mt-2 inline-flex items-center gap-1.5 text-live type-kicker">
                <span class="w-1.5 h-1.5 rounded-full bg-live live-dot"></span>
                Live · {match.minute}'
              </div>
            {:else}
              <div class="mt-2 type-kicker text-fg-faint">Full time</div>
            {/if}
          {/if}
        </div>

        <!-- Away -->
        <button
          type="button"
          class="flex flex-col items-center gap-2 flex-1 min-w-0 pressable disabled:cursor-default"
          onclick={() => match.away && navigateTeam(match.away)}
          disabled={!store.espnReachable || !away}
        >
          {#if away}
            <span class="text-5xl sm:text-7xl leading-none" aria-hidden="true">{away.flag}</span>
            <span class="type-display text-base sm:text-xl text-center leading-[0.95]">{away.name}</span>
            {#if awayOwner}
              <span class="text-[11px] font-bold px-2 py-0.5 rounded type-cond uppercase tracking-wide"
                style:background="color-mix(in srgb, {awayOwner.color} 16%, transparent)"
                style:border="1px solid color-mix(in srgb, {awayOwner.color} 45%, transparent)"
                style:color={awayOwner.color}>
                {awayOwner.name}
              </span>
            {/if}
          {:else}
            <span class="text-fg-faint">{match.away ?? 'TBD'}</span>
          {/if}
        </button>
      </div>

      {#if venue}
        <div class="mt-4 text-center text-xs text-fg-faint type-cond">📍 {venue}</div>
      {/if}
      {#if broadcasts.length > 0}
        <div class="mt-1 text-center text-xs text-fg-faint type-cond">
          📺 {broadcasts.flatMap((b) => b.names ?? b.market ? [b.market] : []).join(' · ') || broadcasts.map((b) => b.media?.shortName).filter(Boolean).join(' · ')}
        </div>
      {/if}
    </section>

    <!-- Events timeline (goals + cards) -->
    {#if matchEvents.length > 0}
      <section class="mb-5">
        <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Key events</h3>
        <div class="space-y-1.5">
          {#each matchEvents as ev (`${ev.minute}-${ev.player}-${ev.type}`)}
            {@const onHome = ev.team === match.home}
            <div class="flex items-center gap-3 text-sm">
              <span class="w-10 text-right text-fg-faint tnum type-display text-xs">{ev.minute}'</span>
              <span class="w-7 flex justify-center">
                {#if ev.type === 'goal'}<span aria-label="Goal">⚽</span>
                {:else if ev.type === 'yellow'}<span class="inline-block w-2.5 h-3.5 rounded-[2px] bg-[#fbbf24]" role="img" aria-label="Yellow card"></span>
                {:else if ev.type === 'red'}<span class="inline-block w-2.5 h-3.5 rounded-[2px] bg-[#ef4444]" role="img" aria-label="Red card"></span>
                {/if}
              </span>
              <span class="flex-1 {onHome ? 'text-left' : 'text-right'}">
                <span class="font-semibold">{ev.player}</span>
                <span class="text-fg-faint ml-2">({TEAMS[ev.team]?.name ?? ev.team})</span>
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ESPN-fetched extras -->
    {#if summaryLoading}
      <div class="text-center text-fg-faint text-sm py-4">Loading match details…</div>
    {:else if summary}
      {#if espnHome?.statistics?.length || espnAway?.statistics?.length}
        <section class="mb-5">
          <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Team stats</h3>
          <div class="card-raised overflow-hidden">
            {#each (espnHome?.statistics ?? []) as stat, i}
              {@const awayStat = espnAway?.statistics?.[i]}
              <div class="grid grid-cols-3 items-center px-4 py-1.5 text-sm border-b border-line/60 last:border-0">
                <span class="text-right tnum font-semibold">{stat.displayValue}</span>
                <span class="text-center type-kicker text-fg-faint">{stat.label ?? stat.name}</span>
                <span class="text-left tnum font-semibold">{awayStat?.displayValue ?? '—'}</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if hasLineups}
        <section class="mb-5">
          <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Lineups</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Home side -->
            <div>
              <div class="flex items-center gap-2 mb-2 text-fg-mute">
                {#if home}<span class="text-xl" aria-hidden="true">{home.flag}</span>{/if}
                <span class="font-semibold text-sm">{home?.name ?? 'Home'}</span>
                <span class="type-kicker text-fg-faint ml-auto">Starting XI</span>
              </div>
              <div class="space-y-1.5">
                {#each lineups.home.starters as p (p.id ?? p.name)}
                  <PlayerCard player={p} compact />
                {/each}
              </div>
              {#if lineups.home.bench.length}
                <div class="mt-3 type-kicker text-fg-faint mb-1.5">Bench</div>
                <div class="space-y-1.5">
                  {#each lineups.home.bench as p (p.id ?? p.name)}
                    <PlayerCard player={p} compact />
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Away side -->
            <div>
              <div class="flex items-center gap-2 mb-2 text-fg-mute">
                {#if away}<span class="text-xl" aria-hidden="true">{away.flag}</span>{/if}
                <span class="font-semibold text-sm">{away?.name ?? 'Away'}</span>
                <span class="type-kicker text-fg-faint ml-auto">Starting XI</span>
              </div>
              <div class="space-y-1.5">
                {#each lineups.away.starters as p (p.id ?? p.name)}
                  <PlayerCard player={p} compact />
                {/each}
              </div>
              {#if lineups.away.bench.length}
                <div class="mt-3 type-kicker text-fg-faint mb-1.5">Bench</div>
                <div class="space-y-1.5">
                  {#each lineups.away.bench as p (p.id ?? p.name)}
                    <PlayerCard player={p} compact />
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </section>
      {/if}

      {#if summary?.article?.headline || summary?.notes?.length}
        <section>
          <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Notes</h3>
          {#if summary?.article?.headline}
            <p class="text-fg mb-2 font-semibold">{summary.article.headline}</p>
          {/if}
          {#if summary?.article?.description}
            <p class="text-fg-mute text-sm">{summary.article.description}</p>
          {/if}
        </section>
      {/if}
    {:else if !fetchable}
      <p class="text-center text-fg-faint text-sm py-4">No ESPN match id available for this fixture.</p>
    {:else if summaryError}
      <p class="text-center text-live/80 text-sm py-4">Couldn't load full match details from ESPN.</p>
    {/if}
  </Modal>
{/if}
