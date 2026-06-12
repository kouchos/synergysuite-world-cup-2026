<script>
  import { teamFor, TEAMS } from '../../lib/data/teams.js';
  import { formatKickoff } from '../../lib/format.js';
  import { fetchSummary, fetchNews } from '../../lib/data/espn.js';
  import { normaliseNews } from '../../lib/data/adapter.js';
  import { swr } from '../../lib/cache.js';
  import { modal } from '../../lib/state/modal.svelte.js';
  import { store } from '../../lib/state/store.svelte.js';
  import Modal from '../Modal.svelte';
  import PlayerCard from '../PlayerCard.svelte';
  import NewsList from '../NewsList.svelte';

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
  // Both teams owned by the same employee = sweepstake derby: they win and
  // lose at the same time.
  const isDerby = $derived(homeOwner && awayOwner && homeOwner.id === awayOwner.id);

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

  // ESPN's summary carries a play-by-play `commentary` array for most WC
  // matches (sometimes nested under gamepackageJSON). Normalise defensively:
  // entries expose text either at the top level or under play.text, and the
  // clock under time/play.clock. Tag goals and cards so the feed can flag them.
  function commentaryKind(c) {
    const type = c?.play?.type?.text ?? '';
    const text = c?.text ?? c?.play?.text ?? '';
    if (/^goal$|penalty.+scored/i.test(type) || /^goal!/i.test(text)) return 'goal';
    if (/yellow card/i.test(type)) return 'yellow';
    if (/red card/i.test(type)) return 'red';
    return null;
  }
  const commentary = $derived.by(() => {
    const raw = summary?.commentary ?? summary?.gamepackageJSON?.commentary ?? [];
    return raw
      .map((c, i) => ({
        sequence: Number(c?.sequence ?? c?.play?.sequenceNumber ?? i),
        clock: c?.time?.displayValue ?? c?.play?.clock?.displayValue ?? '',
        text: (typeof c?.text === 'string' && c.text) || c?.play?.text || '',
        kind: commentaryKind(c),
      }))
      .filter((c) => c.text)
      .sort((a, b) => b.sequence - a.sequence) // newest first, live-feed style
      .slice(0, 300);
  });

  let activeTab = $state('events');
  const tabs = [
    { id: 'events', label: 'Key events' },
    { id: 'commentary', label: 'Commentary' },
    { id: 'sheets', label: 'Team sheets' },
    { id: 'news', label: 'News' },
  ];

  // ESPN has no per-match news endpoint, so "match news" is both teams' feeds
  // merged — fetched lazily on first tab open, deduped (a preview of this very
  // match shows up in both feeds), newest first, tagged with the team's flag.
  let newsArticles = $state(null); // null = not fetched yet
  let newsLoading = $state(false);
  $effect(() => {
    if (activeTab !== 'news' || newsArticles !== null || newsLoading) return;
    const sources = [
      { code: match?.home, flag: home?.flag },
      { code: match?.away, flag: away?.flag },
    ]
      .map((s) => ({ ...s, espnId: s.code ? store.state.teamsRef?.[s.code]?.espnId : null }))
      .filter((s) => s.espnId);
    if (!sources.length) {
      newsArticles = [];
      return;
    }
    newsLoading = true;
    Promise.all(
      sources.map((s) =>
        swr(`espn:news:team:${s.espnId}`, () => fetchNews(s.espnId), 10 * 60 * 1000)
          .then(({ value }) => normaliseNews(value).map((a) => ({ ...a, tag: s.flag })))
          .catch(() => []),
      ),
    )
      .then((lists) => {
        const seen = new Set();
        newsArticles = lists
          .flat()
          .filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)))
          .sort((x, y) => new Date(y.published ?? 0) - new Date(x.published ?? 0));
      })
      .finally(() => (newsLoading = false));
  });

  const venue = $derived(match?.venue ?? summary?.gameInfo?.venue?.fullName ?? null);
  const broadcasts = $derived(summary?.header?.competitions?.[0]?.broadcasts ?? []);

  // ESPN broadcast entries vary: `names` (array of channel strings) in some
  // payloads, `media.shortName` in others; `market` is an object, never a
  // display string — rendering it directly gives "[object Object]".
  const broadcastNames = $derived.by(() => {
    const out = [];
    for (const b of broadcasts) {
      if (Array.isArray(b?.names)) out.push(...b.names.filter((n) => typeof n === 'string'));
      else if (typeof b?.media?.shortName === 'string') out.push(b.media.shortName);
    }
    return [...new Set(out)];
  });

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
              <div class="mt-2">
                <span class="inline-flex items-center gap-1.5 text-live type-kicker">
                  <span class="w-1.5 h-1.5 rounded-full bg-live live-dot"></span>
                  Live · {match.minute}'
                </span>
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

      {#if isDerby}
        <div class="mt-4 flex items-center justify-center gap-2 text-sm rounded-md border border-gold/30 bg-gold/8 px-3 py-1.5">
          <span aria-hidden="true">⚔️</span>
          <span class="type-kicker text-gold">Sweepstake derby</span>
          <span class="font-bold" style:color={homeOwner.color}>{homeOwner.name}</span>
          <span class="text-fg-faint">vs</span>
          <span class="font-bold" style:color={homeOwner.color}>{homeOwner.name}</span>
          <span class="text-fg-faint">— wins either way</span>
        </div>
      {/if}
      {#if venue}
        <div class="mt-4 text-center text-xs text-fg-faint type-cond">📍 {venue}</div>
      {/if}
      {#if broadcastNames.length > 0}
        <div class="mt-1 text-center text-xs text-fg-faint type-cond">
          📺 {broadcastNames.join(' · ')}
        </div>
      {/if}
    </section>

    <!-- Tab strip: key events · commentary · team sheets -->
    <nav class="flex gap-1 mb-4 border-b border-line overflow-x-auto">
      {#each tabs as t (t.id)}
        <button
          type="button"
          onclick={() => (activeTab = t.id)}
          class="px-3.5 py-2 type-display text-[13px] border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5
            {activeTab === t.id ? 'border-volt text-volt' : 'border-transparent text-fg-faint hover:text-fg-mute'}"
        >
          {t.label}
          {#if t.id === 'commentary' && isLive && commentary.length}
            <span class="live-dot inline-block w-1.5 h-1.5 rounded-full bg-live" aria-label="Live commentary running"></span>
          {/if}
        </button>
      {/each}
    </nav>

    {#if activeTab === 'events'}
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
      {:else if !summaryLoading}
        <p class="text-center text-fg-faint text-sm py-4">
          {isScheduled
            ? 'Key events will appear here once the match kicks off.'
            : isLive
              ? 'No key events yet — goals and cards land here as they happen.'
              : 'No key events recorded for this match.'}
        </p>
      {/if}

      {#if summaryLoading && !summary}
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
    {:else if activeTab === 'commentary'}
      {#if summaryLoading && !summary}
        <p class="text-center text-fg-faint text-sm py-6">Loading commentary…</p>
      {:else if commentary.length > 0}
        <section aria-live={isLive ? 'polite' : undefined}>
          <h3 class="type-kicker text-fg-mute kicker-slash mb-3">
            {isLive ? 'Live commentary' : 'Commentary'}
            <span class="text-fg-faint font-normal normal-case tracking-normal ml-1">— newest first</span>
          </h3>
          <div class="space-y-1">
            {#each commentary as c (c.sequence)}
              <div class="flex gap-3 px-3 py-2 rounded-md text-sm leading-snug
                {c.kind === 'goal' ? 'bg-volt/10 border-l-2 border-volt' :
                 c.kind === 'red' ? 'bg-live/10 border-l-2 border-live' :
                 c.kind === 'yellow' ? 'bg-gold/10 border-l-2 border-gold' : 'odd:bg-ink-3/50'}">
                <span class="w-11 shrink-0 text-right text-fg-faint tnum type-display text-xs pt-0.5">{c.clock}</span>
                <span class="{c.kind === 'goal' ? 'text-fg font-semibold' : 'text-fg-mute'}">{c.text}</span>
              </div>
            {/each}
          </div>
        </section>
      {:else}
        <p class="text-center text-fg-faint text-sm py-6">
          {isScheduled
            ? 'Commentary starts when the match kicks off.'
            : 'No commentary feed available for this match.'}
        </p>
      {/if}
    {:else if activeTab === 'sheets'}
      {#if summaryLoading && !summary}
        <p class="text-center text-fg-faint text-sm py-6">Loading team sheets…</p>
      {:else if hasLineups}
        <section>
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
      {:else}
        <p class="text-center text-fg-faint text-sm py-6">
          {isScheduled
            ? 'Team sheets are published roughly an hour before kickoff.'
            : 'No team sheets available for this match.'}
        </p>
      {/if}
    {:else}
      {#if newsLoading}
        <p class="text-center text-fg-faint text-sm py-6">Loading news…</p>
      {:else if !newsArticles?.length}
        <p class="text-center text-fg-faint text-sm py-6">No news feed available for this match.</p>
      {:else}
        <section>
          <h3 class="type-kicker text-fg-mute kicker-slash mb-3">
            {home?.name ?? 'Home'} &amp; {away?.name ?? 'Away'} news
          </h3>
          <NewsList articles={newsArticles} />
          <p class="mt-3 text-xs text-fg-faint text-center">Articles open on espn.com in a new tab.</p>
        </section>
      {/if}
    {/if}
  </Modal>
{/if}
