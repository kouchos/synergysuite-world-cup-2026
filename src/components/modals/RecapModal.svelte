<script>
  import { teamFor, TEAMS } from '../../lib/data/teams.js';
  import { formatKickoff } from '../../lib/format.js';
  import { recapSince } from '../../lib/state/recap.js';
  import { teamOwner } from '../../lib/state/prizes.js';
  import { modal } from '../../lib/state/modal.svelte.js';
  import { store } from '../../lib/state/store.svelte.js';
  import { ui } from '../../lib/state/ui.svelte.js';
  import Modal from '../Modal.svelte';

  let { sinceMs, prevRanks = null } = $props();

  const recap = $derived(recapSince(store.state, sinceMs, store.employees, prevRanks));

  function ord(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function ownerDot(code) {
    return code ? teamOwner(code, store.employees) : null;
  }

  function navigateGame(matchId) {
    if (!store.espnReachable) return;
    modal.game(matchId);
  }
</script>

<Modal title="While you were sleeping" accentColor="#c8f542">
  <p class="text-sm text-fg-mute mb-5">
    Everything since <span class="text-fg font-semibold">{formatKickoff(new Date(recap.since).toISOString())}</span>
    <span class="text-fg-faint">(recaps cover at most the last 48 hours)</span>
  </p>

  {#if recap.results.length === 0 && recap.live.length === 0}
    <div class="card clip-corner px-6 py-10 text-center">
      <div class="text-5xl mb-3" aria-hidden="true">😴</div>
      <p class="text-fg-mute text-sm">All quiet — no games finished in this window.</p>
    </div>
  {:else}
    {#if recap.live.length}
      <section class="mb-5">
        <h3 class="type-kicker text-live kicker-slash mb-3">Happening right now</h3>
        <div class="space-y-1.5">
          {#each recap.live as m (m.id)}
            {@const ht = TEAMS[m.home] ? teamFor(m.home) : null}
            {@const at = TEAMS[m.away] ? teamFor(m.away) : null}
            {#if ht && at}
              <button type="button" class="w-full text-left card-raised lift px-3 py-2 disabled:cursor-default flex items-center gap-2 text-sm border-live/30"
                onclick={() => navigateGame(m.id)} disabled={!store.espnReachable}>
                <span aria-hidden="true">{ht.flag}</span>
                <span class="font-medium truncate flex-1">{ht.name}</span>
                <span class="type-display tnum text-base">{m.homeGoals}–{m.awayGoals}</span>
                <span class="font-medium truncate flex-1 text-right">{at.name}</span>
                <span aria-hidden="true">{at.flag}</span>
                <span class="text-live text-xs type-display tnum shrink-0">{m.minute}'</span>
              </button>
            {/if}
          {/each}
        </div>
      </section>
    {/if}

    {#if recap.results.length}
      <section class="mb-5">
        <h3 class="type-kicker text-fg-mute kicker-slash mb-3">
          Results <span class="text-fg-faint font-normal">({recap.results.length})</span>
        </h3>
        <div class="space-y-1.5">
          {#each recap.results as m (m.id)}
            {@const ht = TEAMS[m.home] ? teamFor(m.home) : null}
            {@const at = TEAMS[m.away] ? teamFor(m.away) : null}
            {@const ho = ownerDot(m.home)}
            {@const ao = ownerDot(m.away)}
            {#if ht && at}
              <button type="button" class="w-full text-left card-raised lift px-3 py-2 disabled:cursor-default flex items-center gap-2 text-sm"
                onclick={() => navigateGame(m.id)} disabled={!store.espnReachable}>
                <span aria-hidden="true">{ht.flag}</span>
                <span class="font-medium truncate flex-1 inline-flex items-center gap-1.5">
                  {ht.name}
                  {#if ho}<span class="w-1.5 h-1.5 rounded-full shrink-0" style:background-color={ho.color} title={ho.name} aria-hidden="true"></span>{/if}
                </span>
                <span class="type-display tnum text-base">{m.homeGoals}–{m.awayGoals}</span>
                <span class="font-medium truncate flex-1 inline-flex items-center justify-end gap-1.5">
                  {#if ao}<span class="w-1.5 h-1.5 rounded-full shrink-0" style:background-color={ao.color} title={ao.name} aria-hidden="true"></span>{/if}
                  {at.name}
                </span>
                <span aria-hidden="true">{at.flag}</span>
                {#if ho && ao && ho.id === ao.id}
                  <span class="type-kicker text-[9px] text-gold shrink-0" title="Sweepstake derby">⚔️</span>
                {/if}
              </button>
            {/if}
          {/each}
        </div>
      </section>
    {/if}

    {#if recap.scorers.length}
      <section class="mb-5">
        <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Scorers</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {#each recap.scorers as s (`${s.team}|${s.player}`)}
            {@const t = TEAMS[s.team] ? teamFor(s.team) : null}
            <div class="card-raised px-3 py-2 flex items-center gap-2.5 text-sm">
              <span class="shrink-0" aria-hidden="true">⚽</span>
              {#if s.goals > 1}<span class="type-display tnum text-gold shrink-0">{s.goals}×</span>{/if}
              <span class="font-semibold truncate">{s.player}</span>
              {#if t}<span class="text-fg-faint text-xs truncate">{t.flag} {t.name}</span>{/if}
              {#if s.owner}
                <span class="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style:background-color={s.owner.color} title={s.owner.name} aria-hidden="true"></span>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if recap.cards.length}
      <section class="mb-5">
        <h3 class="type-kicker text-gold/90 kicker-slash mb-3">
          Cards <span class="text-fg-faint font-normal">({recap.cards.length})</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {#each recap.cards as ev, i (i)}
            {@const t = TEAMS[ev.team] ? teamFor(ev.team) : null}
            <div class="card-raised px-3 py-2 flex items-center gap-2.5 text-sm">
              <span
                class="inline-block w-2.5 h-3.5 rounded-[2px] shrink-0 {ev.type === 'red' ? 'bg-[#ef4444]' : 'bg-[#fbbf24]'}"
                role="img"
                aria-label={ev.type === 'red' ? 'Red card' : 'Yellow card'}
              ></span>
              <span class="font-semibold truncate">{ev.player ?? 'Unknown player'}</span>
              {#if t}<span class="text-fg-faint text-xs truncate">{t.flag} {t.name}</span>{/if}
              {#if ev.minute != null}<span class="text-fg-faint text-xs tnum shrink-0">{ev.minute}′</span>{/if}
              {#if ev.owner}
                <span class="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style:background-color={ev.owner.color} title={ev.owner.name} aria-hidden="true"></span>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if recap.movements.length}
      <section class="mb-5">
        <h3 class="type-kicker text-volt kicker-slash mb-3">Race movers</h3>
        <div class="flex flex-wrap gap-2">
          {#each recap.movements as mv (mv.employee.id)}
            <span class="card-raised px-3 py-1.5 inline-flex items-center gap-2 text-sm">
              <span class="font-bold" style:color={mv.employee.color}>{mv.employee.name}</span>
              <span class="text-fg-faint tnum type-cond">{ord(mv.from)} →</span>
              <span class="tnum type-display {mv.to < mv.from ? 'text-volt' : 'text-live'}">{ord(mv.to)}</span>
              <span aria-hidden="true">{mv.to < mv.from ? '↑' : '↓'}</span>
            </span>
          {/each}
        </div>
      </section>
    {/if}

    {#if recap.ownerDeltas.length}
      <section class="mb-5">
        <h3 class="type-kicker text-fg-mute kicker-slash mb-3">Who gained what</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {#each recap.ownerDeltas as d (d.employee.id)}
            <div class="card-raised px-3 py-2 flex items-center gap-3 text-sm">
              <span class="w-1.5 self-stretch rounded-sm shrink-0" style:background-color={d.employee.color} aria-hidden="true"></span>
              <span class="font-bold w-14 shrink-0" style:color={d.employee.color}>{d.employee.name}</span>
              <span class="text-fg-mute tnum type-cond text-xs flex-1">
                {d.w}W {d.d}D {d.l}L · {d.gf} scored
                {#if d.cardPts}<span class="text-gold"> · +{d.cardPts} card pt{d.cardPts === 1 ? '' : 's'}</span>{/if}
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    {#if recap.england}
      <p class="mb-5 text-sm text-fg-mute italic border-l-2 border-gold/40 pl-3">
        Meanwhile: {recap.england}
      </p>
    {/if}
  {/if}

  <footer class="pt-3 border-t border-line flex items-center justify-between gap-3 text-xs text-fg-faint">
    <span>Auto-recap pops up when you've been away 6+ hours and something happened.</span>
    <button
      type="button"
      class="pressable shrink-0 px-2.5 py-1 rounded border border-line hover:bg-ink-3 {ui.recapDisabled ? 'text-fg-faint' : 'text-volt'}"
      onclick={() => ui.setRecapDisabled(!ui.recapDisabled)}
    >Auto-recap: {ui.recapDisabled ? 'off' : 'on'}</button>
  </footer>
</Modal>
