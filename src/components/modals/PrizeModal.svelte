<script>
  import { teamFor } from '../../lib/data/teams.js';
  import { store } from '../../lib/state/store.svelte.js';
  import { formatKickoff } from '../../lib/format.js';
  import {
    overallLeaderboard,
    mostCardsLeaderboard,
    worstTeamRanking,
    goldenBootTable,
    survivorsLeaderboard,
    survivorBreakdown,
    cardTimeline,
    pointsTimeline,
    goalTimeline,
    teamResults,
    positionRace,
  } from '../../lib/state/prizes.js';
  import Modal from '../Modal.svelte';
  import OwnerBadge from '../OwnerBadge.svelte';
  import PositionChart from '../PositionChart.svelte';

  let { category } = $props();

  const META = {
    overall: {
      title: 'Overall race',
      accent: '#c8f542',
      blurb: 'Group-stage points across each player’s six teams — win 3 · draw 1 · loss 0.',
    },
    worst: {
      title: 'Worst team race',
      accent: '#ff4d5d',
      blurb:
        'Ranked worst-first: earliest exit → fewest pts → worst GD → fewest goals scored. The 🥄 goes to whoever owns the bottom team.',
    },
    cards: {
      title: 'Most cards race',
      accent: '#f2c14e',
      blurb: 'Every card shown to a player’s six teams counts — 🟨 1 pt · 🟥 2 pts.',
    },
    boot: {
      title: 'Golden boot race',
      accent: '#f2c14e',
      blurb: 'Tournament top scorers — the prize follows whoever owns the scorer’s team.',
    },
    survivors: {
      title: 'Teams still in',
      accent: '#4d94ff',
      blurb: 'How many of each player’s six teams are still in the competition — the more you have left, the better your odds of a winner.',
    },
  };
  const meta = $derived(META[category] ?? META.overall);

  const state = $derived(store.state);
  const employees = $derived(store.employees);

  const overall = $derived(category === 'overall' ? overallLeaderboard(state, employees) : []);
  const cards = $derived(category === 'cards' ? mostCardsLeaderboard(state, employees) : []);
  const worst = $derived(category === 'worst' ? worstTeamRanking(state, employees) : []);
  const boot = $derived(category === 'boot' ? goldenBootTable(state, employees) : []);
  const survivors = $derived(category === 'survivors' ? survivorsLeaderboard(state, employees) : []);

  // Animated "position over time" race for the standings view of this category.
  const race = $derived(positionRace(category, state, employees));
  const raceNoun = $derived(
    category === 'worst' ? 'team' : category === 'boot' ? 'scorer' : 'player',
  );

  // Drill-down selection. null shows the ranking table; otherwise an employee
  // id (overall/cards), a fifaCode (worst) or `player|team` (boot).
  let selected = $state(null);

  function resultClasses(result) {
    if (result === 'W') return 'bg-volt/15 text-volt border-volt/40';
    if (result === 'D') return 'bg-ink-3 text-fg-mute border-line';
    return 'bg-live/15 text-live border-live/40';
  }
</script>

{#snippet backButton()}
  <button
    type="button"
    class="pressable inline-flex items-center gap-1.5 text-sm text-fg-mute hover:text-fg mb-4"
    onclick={() => (selected = null)}
  >
    <span aria-hidden="true">←</span> Back to standings
  </button>
{/snippet}

{#snippet matchLine(match, minute)}
  {@const ht = teamFor(match.home)}
  {@const at = teamFor(match.away)}
  <div class="text-xs text-fg-faint type-cond tnum truncate">
    {#if minute != null}{minute}′ ·{/if}
    {ht.flag} {ht.name} {match.homeGoals}–{match.awayGoals} {at.name} {at.flag}
    · {formatKickoff(match.utc)}
  </div>
{/snippet}

<Modal title={meta.title} accentColor={meta.accent}>
  {#if !selected}
    <p class="text-sm text-fg-mute mb-4">{meta.blurb}</p>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="type-kicker text-fg-faint text-left">
            <th class="font-[650] py-2 pl-3 w-8" scope="col">#</th>
            {#if category === 'overall'}
              <th class="font-[650] py-2" scope="col">Player</th>
              <th class="font-[650] py-2 text-right w-12" scope="col" title="Games played">GP</th>
              <th class="font-[650] py-2 text-right w-12" scope="col">Pts</th>
              <th class="font-[650] py-2 text-right w-12" scope="col">GD</th>
              <th class="font-[650] py-2 text-right w-12" scope="col">GF</th>
              <th class="font-[650] py-2 text-right w-16 pr-3" scope="col">Behind</th>
            {:else if category === 'cards'}
              <th class="font-[650] py-2" scope="col">Player</th>
              <th class="font-[650] py-2 text-right w-10" scope="col" title="Yellow cards">🟨</th>
              <th class="font-[650] py-2 text-right w-10" scope="col" title="Red cards">🟥</th>
              <th class="font-[650] py-2 text-right w-12" scope="col">Pts</th>
              <th class="font-[650] py-2 text-right w-16 pr-3" scope="col">Behind</th>
            {:else if category === 'worst'}
              <th class="font-[650] py-2" scope="col">Team</th>
              <th class="font-[650] py-2" scope="col">Owner</th>
              <th class="font-[650] py-2 text-right w-8" scope="col">P</th>
              <th class="font-[650] py-2 text-right w-10" scope="col">Pts</th>
              <th class="font-[650] py-2 text-right w-10" scope="col">GD</th>
              <th class="font-[650] py-2 text-right w-10 pr-3" scope="col">GF</th>
            {:else if category === 'survivors'}
              <th class="font-[650] py-2" scope="col">Player</th>
              <th class="font-[650] py-2" scope="col">Teams left</th>
              <th class="font-[650] py-2 text-right w-14 pr-3" scope="col">In</th>
            {:else}
              <th class="font-[650] py-2" scope="col">Player</th>
              <th class="font-[650] py-2" scope="col">Team</th>
              <th class="font-[650] py-2" scope="col">Owner</th>
              <th class="font-[650] py-2 text-right w-14" scope="col">Goals</th>
              <th class="font-[650] py-2 text-right w-16 pr-3" scope="col">Behind</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#if category === 'overall'}
            {#each overall as r, i (r.employee.id)}
              <tr
                class="border-t border-line/60 hover:bg-ink-3 cursor-pointer transition-colors"
                onclick={() => (selected = r.employee.id)}
              >
                <td class="py-2 pl-3 tnum type-display text-sm {i === 0 ? 'text-volt' : 'text-fg-faint'}">{i + 1}</td>
                <td class="py-2 pl-0 relative">
                  <span class="absolute left-0 top-0 bottom-0 w-1" style:background-color={r.employee.color} aria-hidden="true"></span>
                  <button type="button" class="font-semibold text-[13px] pl-3 text-left" onclick={() => (selected = r.employee.id)}>{r.employee.name}</button>
                </td>
                <td class="text-right tnum type-cond text-fg-mute">{r.gp}</td>
                <td class="text-right tnum type-display text-sm">{r.pts}</td>
                <td class="text-right tnum type-cond text-fg-mute">{r.gd >= 0 ? '+' : ''}{r.gd}</td>
                <td class="text-right tnum type-cond text-fg-mute">{r.gf}</td>
                <td class="text-right tnum type-cond text-fg-faint pr-3">{i === 0 ? '—' : `−${overall[0].pts - r.pts}`}</td>
              </tr>
            {/each}
          {:else if category === 'cards'}
            {#each cards as r, i (r.employee.id)}
              <tr
                class="border-t border-line/60 hover:bg-ink-3 cursor-pointer transition-colors"
                onclick={() => (selected = r.employee.id)}
              >
                <td class="py-2 pl-3 tnum type-display text-sm {i === 0 ? 'text-gold' : 'text-fg-faint'}">{i + 1}</td>
                <td class="py-2 pl-0 relative">
                  <span class="absolute left-0 top-0 bottom-0 w-1" style:background-color={r.employee.color} aria-hidden="true"></span>
                  <button type="button" class="font-semibold text-[13px] pl-3 text-left" onclick={() => (selected = r.employee.id)}>{r.employee.name}</button>
                </td>
                <td class="text-right tnum type-cond text-fg-mute">{r.yellow}</td>
                <td class="text-right tnum type-cond text-fg-mute">{r.red}</td>
                <td class="text-right tnum type-display text-sm">{r.points}</td>
                <td class="text-right tnum type-cond text-fg-faint pr-3">{i === 0 ? '—' : `−${cards[0].points - r.points}`}</td>
              </tr>
            {/each}
          {:else if category === 'worst'}
            {#each worst as r, i (r.row.fifaCode)}
              {@const t = teamFor(r.row.fifaCode)}
              <tr
                class="border-t border-line/60 hover:bg-ink-3 cursor-pointer transition-colors"
                onclick={() => (selected = r.row.fifaCode)}
              >
                <td class="py-2 pl-3 tnum type-display text-sm {i === 0 ? 'text-live' : 'text-fg-faint'}">{i + 1}</td>
                <td class="py-2">
                  <button type="button" class="inline-flex items-center gap-2 font-semibold text-[13px] text-left" onclick={() => (selected = r.row.fifaCode)}>
                    <span class="text-lg leading-none" aria-hidden="true">{t.flag}</span>
                    <span class="truncate">{t.name}</span>
                    {#if i === 0}<span aria-label="Currently the worst team">🥄</span>{/if}
                    {#if r.eliminated}<span class="type-kicker text-live text-[10px] border border-live/40 rounded px-1 py-px">Out</span>{/if}
                  </button>
                </td>
                <td class="py-2">
                  {#if r.owner}
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full" style:background-color={r.owner.color} aria-hidden="true"></span>
                      <span class="text-xs font-bold" style:color={r.owner.color}>{r.owner.name}</span>
                    </span>
                  {:else}
                    <span class="text-fg-faint text-xs">—</span>
                  {/if}
                </td>
                <td class="text-right tnum type-cond text-fg-mute">{r.row.p}</td>
                <td class="text-right tnum type-display text-sm">{r.row.pts}</td>
                <td class="text-right tnum type-cond text-fg-mute">{r.row.gd >= 0 ? '+' : ''}{r.row.gd}</td>
                <td class="text-right tnum type-cond text-fg-mute pr-3">{r.row.gf}</td>
              </tr>
            {/each}
          {:else if category === 'survivors'}
            {#each survivors as r, i (r.employee.id)}
              <tr
                class="border-t border-line/60 hover:bg-ink-3 cursor-pointer transition-colors"
                onclick={() => (selected = r.employee.id)}
              >
                <td class="py-2 pl-3 tnum type-display text-sm {i === 0 ? 'text-[#4d94ff]' : 'text-fg-faint'}">{i + 1}</td>
                <td class="py-2 pl-0 relative">
                  <span class="absolute left-0 top-0 bottom-0 w-1" style:background-color={r.employee.color} aria-hidden="true"></span>
                  <button type="button" class="font-semibold text-[13px] pl-3 text-left" onclick={() => (selected = r.employee.id)}>{r.employee.name}</button>
                </td>
                <td class="py-2">
                  <span class="inline-flex flex-wrap gap-1">
                    {#each r.teams as tm (tm.code)}
                      {@const t = teamFor(tm.code)}
                      <span
                        class="text-base leading-none {tm.alive ? '' : 'opacity-30 grayscale'}"
                        title={`${t.name}${tm.alive ? '' : ' (out)'}`}
                        aria-label={`${t.name}${tm.alive ? '' : ' — out'}`}
                      >{t.flag}</span>
                    {/each}
                  </span>
                </td>
                <td class="text-right tnum type-display text-sm pr-3">{r.alive}<span class="text-fg-faint text-xs">/{r.total}</span></td>
              </tr>
            {/each}
          {:else}
            {#each boot as r, i (`${r.player}|${r.team}`)}
              {@const t = teamFor(r.team)}
              <tr
                class="border-t border-line/60 hover:bg-ink-3 cursor-pointer transition-colors"
                onclick={() => (selected = `${r.player}|${r.team}`)}
              >
                <td class="py-2 pl-3 tnum type-display text-sm {i === 0 ? 'text-gold' : 'text-fg-faint'}">{i + 1}</td>
                <td class="py-2">
                  <button type="button" class="font-semibold text-[13px] text-left" onclick={() => (selected = `${r.player}|${r.team}`)}>{r.player}</button>
                </td>
                <td class="py-2 text-fg-mute text-xs whitespace-nowrap"><span aria-hidden="true">{t.flag}</span> {t.name}</td>
                <td class="py-2">
                  {#if r.owner}
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full" style:background-color={r.owner.color} aria-hidden="true"></span>
                      <span class="text-xs font-bold" style:color={r.owner.color}>{r.owner.name}</span>
                    </span>
                  {:else}
                    <span class="text-fg-faint text-xs">—</span>
                  {/if}
                </td>
                <td class="text-right tnum type-display text-sm">{r.goals}</td>
                <td class="text-right tnum type-cond text-fg-faint pr-3">{i === 0 ? '—' : `−${boot[0].goals - r.goals}`}</td>
              </tr>
            {:else}
              <tr><td colspan="6" class="py-6 text-center text-fg-faint text-sm">No goals scored yet.</td></tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <p class="mt-3 text-xs text-fg-faint">
      {category === 'worst'
        ? 'Click a team to see how it got there.'
        : category === 'survivors'
          ? 'Click a player to see the fate of each of their teams.'
          : 'Click a row to see where the points came from.'}
    </p>

    <!-- Position-over-time race: replays how each line's table position moved
         after every game, in the players' own colours. -->
    <section class="mt-6">
      <div class="flex items-baseline justify-between mb-2">
        <h3 class="type-kicker text-fg-mute kicker-slash">Position over time</h3>
        <span class="type-kicker text-fg-faint">after every game</span>
      </div>
      {#if race.gameCount > 0}
        <div class="card p-3 sm:p-4">
          <PositionChart frames={race.frames} lines={race.lines} rankCount={race.rankCount} accent={meta.accent} />
        </div>
        {#if category === 'worst' || category === 'boot'}
          <p class="mt-2 text-xs text-fg-faint">
            Showing the top {race.lines.length} in the {raceNoun} race, coloured by their owner.
          </p>
        {/if}
      {:else}
        <div class="card p-6 text-center text-fg-faint text-sm">
          The race chart appears once games start counting{category === 'cards' ? ' cards' : category === 'boot' ? ' goals' : ''}.
        </div>
      {/if}
    </section>
  {:else if category === 'cards'}
    {@const emp = employees.find((e) => e.id === selected)}
    {@const row = cards.find((r) => r.employee.id === selected)}
    {@const rank = cards.findIndex((r) => r.employee.id === selected) + 1}
    {@const leader = cards[0]}
    {@const timeline = emp ? cardTimeline(state, emp) : []}
    {@render backButton()}
    {#if emp && row}
      {@const behind = leader.points - row.points}
      {@const toLead = behind + 1}
      <div class="card clip-corner p-4 mb-4"
        style:background="linear-gradient(135deg, color-mix(in srgb, {emp.color} 14%, var(--color-ink-2)), var(--color-ink-2) 65%)">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="type-display text-2xl">{emp.name}</span>
          <span class="text-fg-mute text-sm tnum type-cond">
            <span class="inline-block w-2.5 h-3.5 rounded-[2px] bg-[#fbbf24] align-[-2px]" aria-hidden="true"></span> {row.yellow}
            &nbsp;<span class="inline-block w-2.5 h-3.5 rounded-[2px] bg-[#ef4444] align-[-2px]" aria-hidden="true"></span> {row.red}
            &nbsp;· <span class="type-display text-gold text-base">{row.points} pts</span> · #{rank} in the race
          </span>
        </div>
        <p class="mt-2 text-sm text-fg-mute">
          {#if rank === 1}
            Leading the cards race{#if cards[1]}&nbsp;— {cards[1].employee.name} {row.points === cards[1].points ? 'is level on points' : `is ${row.points - cards[1].points} pt${row.points - cards[1].points === 1 ? '' : 's'} back`}{/if}.
          {:else if behind === 0}
            Level on points with {leader.employee.name} — any card takes the lead.
          {:else}
            {behind} pt{behind === 1 ? '' : 's'} behind {leader.employee.name} — {Math.ceil(toLead / 2)} more red{Math.ceil(toLead / 2) === 1 ? '' : 's'} (or {toLead} yellow{toLead === 1 ? '' : 's'}) takes the lead.
          {/if}
        </p>
      </div>

      {#if timeline.length}
        <div class="flex items-baseline justify-between mb-2">
          <h3 class="type-kicker text-fg-mute kicker-slash">Card timeline</h3>
          <span class="type-kicker text-fg-faint">pts · running total</span>
        </div>
        <ol class="space-y-1.5">
          {#each timeline as ev, i (i)}
            {@const t = teamFor(ev.team)}
            <li class="card-raised px-3 py-2 flex items-center gap-3 text-sm">
              <span
                class="inline-block w-3 h-4 rounded-[2px] shrink-0 {ev.type === 'red' ? 'bg-[#ef4444]' : 'bg-[#fbbf24]'}"
                role="img"
                aria-label={ev.type === 'red' ? 'Red card' : 'Yellow card'}
              ></span>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">
                  {ev.player ?? 'Unknown player'}
                  <span class="text-fg-faint font-normal">· {t.flag} {t.name}</span>
                </div>
                {@render matchLine(ev.match, ev.minute)}
              </div>
              <div class="text-right shrink-0 tnum">
                <span class="text-fg-faint text-xs">+{ev.points}</span>
                <span class="type-display text-base ml-2">{ev.running}</span>
              </div>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="text-fg-faint text-sm">No cards for {emp.name}’s teams yet — squeaky clean.</p>
      {/if}
    {/if}
  {:else if category === 'overall'}
    {@const emp = employees.find((e) => e.id === selected)}
    {@const row = overall.find((r) => r.employee.id === selected)}
    {@const rank = overall.findIndex((r) => r.employee.id === selected) + 1}
    {@const leader = overall[0]}
    {@const timeline = emp ? pointsTimeline(state, emp) : []}
    {@render backButton()}
    {#if emp && row}
      {@const behind = leader.pts - row.pts}
      <div class="card clip-corner p-4 mb-4"
        style:background="linear-gradient(135deg, color-mix(in srgb, {emp.color} 14%, var(--color-ink-2)), var(--color-ink-2) 65%)">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="type-display text-2xl">{emp.name}</span>
          <span class="text-fg-mute text-sm tnum type-cond">
            <span class="type-display text-volt text-base">{row.pts} pts</span>
            · GD {row.gd >= 0 ? '+' : ''}{row.gd} · #{rank} overall
          </span>
        </div>
        <p class="mt-2 text-sm text-fg-mute">
          {#if rank === 1}
            Leading the race{#if overall[1]}&nbsp;— {overall[1].employee.name} {row.pts === overall[1].pts ? 'is level on points' : `is ${row.pts - overall[1].pts} pt${row.pts - overall[1].pts === 1 ? '' : 's'} back`}{/if}.
          {:else if behind === 0}
            Level on points with {leader.employee.name} — goal difference decides it.
          {:else}
            {behind} pt{behind === 1 ? '' : 's'} behind {leader.employee.name} — one win is worth 3.
          {/if}
        </p>
      </div>

      {#if timeline.length}
        <div class="flex items-baseline justify-between mb-2">
          <h3 class="type-kicker text-fg-mute kicker-slash">Points timeline</h3>
          <span class="type-kicker text-fg-faint">pts · running total</span>
        </div>
        <ol class="space-y-1.5">
          {#each timeline as r, i (i)}
            {@const t = teamFor(r.team)}
            {@const opp = teamFor(r.opponent)}
            <li class="card-raised px-3 py-2 flex items-center gap-3 text-sm">
              <span class="inline-flex items-center justify-center w-6 h-6 rounded type-display text-xs border {resultClasses(r.result)} shrink-0">{r.result}</span>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">
                  {t.flag} {t.name}
                  <span class="text-fg-faint font-normal tnum">{r.gf}–{r.ga} vs {opp.name} {opp.flag}</span>
                </div>
                <div class="text-xs text-fg-faint type-cond">
                  {#if r.match.group}Group {r.match.group} · {/if}{formatKickoff(r.match.utc)}
                </div>
              </div>
              <div class="text-right shrink-0 tnum">
                <span class="text-fg-faint text-xs">+{r.points}</span>
                <span class="type-display text-base ml-2">{r.running}</span>
              </div>
            </li>
          {/each}
        </ol>
        <p class="mt-3 text-xs text-fg-faint">
          Timeline counts completed games with match data; the headline total comes from the official
          group standings, so the two can differ while games are in progress.
        </p>
      {:else}
        <p class="text-fg-faint text-sm">No completed games for {emp.name}’s teams yet.</p>
      {/if}
    {/if}
  {:else if category === 'boot'}
    {@const row = boot.find((r) => `${r.player}|${r.team}` === selected)}
    {@const rank = boot.findIndex((r) => `${r.player}|${r.team}` === selected) + 1}
    {@const leader = boot[0]}
    {@const timeline = row ? goalTimeline(state, row.player, row.team) : []}
    {@render backButton()}
    {#if row}
      {@const t = teamFor(row.team)}
      {@const behind = leader.goals - row.goals}
      <div class="card clip-corner p-4 mb-4">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="text-3xl leading-none" aria-hidden="true">{t.flag}</span>
          <span class="type-display text-2xl">{row.player}</span>
          <span class="text-fg-mute text-sm tnum type-cond">
            {t.name} · <span class="type-display text-gold text-base">{row.goals} goal{row.goals === 1 ? '' : 's'}</span> · #{rank}
          </span>
          {#if row.owner}<OwnerBadge employee={row.owner} size="sm" />{/if}
        </div>
        <p class="mt-2 text-sm text-fg-mute">
          {#if rank === 1}
            Leading the golden boot race{#if boot[1]}&nbsp;— {boot[1].player} {row.goals === boot[1].goals ? 'is level' : `is ${row.goals - boot[1].goals} back`}{/if}.
          {:else if behind === 0}
            Level with {leader.player} at the top.
          {:else}
            {behind} goal{behind === 1 ? '' : 's'} behind {leader.player}.
          {/if}
        </p>
      </div>

      {#if timeline.length}
        <div class="flex items-baseline justify-between mb-2">
          <h3 class="type-kicker text-fg-mute kicker-slash">Goal timeline</h3>
          <span class="type-kicker text-fg-faint">running total</span>
        </div>
        <ol class="space-y-1.5">
          {#each timeline as ev, i (i)}
            <li class="card-raised px-3 py-2 flex items-center gap-3 text-sm">
              <span class="shrink-0" aria-hidden="true">⚽</span>
              <div class="flex-1 min-w-0">
                {@render matchLine(ev.match, ev.minute)}
              </div>
              <span class="type-display text-base tnum shrink-0">{ev.running}</span>
            </li>
          {/each}
        </ol>
        {#if timeline.length < row.goals}
          <p class="mt-3 text-xs text-fg-faint">
            Showing {timeline.length} of {row.goals} goals — the rest came in games without per-match event data.
          </p>
        {/if}
      {:else}
        <p class="text-fg-faint text-sm">No per-match event data for these goals.</p>
      {/if}
    {/if}
  {:else if category === 'survivors'}
    {@const emp = employees.find((e) => e.id === selected)}
    {@const row = survivors.find((r) => r.employee.id === selected)}
    {@const rank = survivors.findIndex((r) => r.employee.id === selected) + 1}
    {@const breakdown = emp ? survivorBreakdown(state, emp) : []}
    {@render backButton()}
    {#if emp && row}
      <div class="card clip-corner p-4 mb-4"
        style:background="linear-gradient(135deg, color-mix(in srgb, {emp.color} 14%, var(--color-ink-2)), var(--color-ink-2) 65%)">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="type-display text-2xl">{emp.name}</span>
          <span class="text-fg-mute text-sm tnum type-cond">
            <span class="type-display text-base" style:color="#4d94ff">{row.alive}</span> of {row.total} teams still in · #{rank}
          </span>
        </div>
        <p class="mt-2 text-sm text-fg-mute">
          {#if row.alive === 0}
            All six teams are out — no runners left in the race.
          {:else if rank === 1}
            Leading the pack with the most teams still standing — the best shot at owning the champion.
          {:else}
            {row.alive} team{row.alive === 1 ? '' : 's'} still alive and chasing the trophy.
          {/if}
        </p>
      </div>

      <div class="type-kicker text-fg-mute kicker-slash mb-2">The six teams</div>
      <ol class="space-y-1.5">
        {#each breakdown as tm (tm.code)}
          {@const t = teamFor(tm.code)}
          <li class="card-raised px-3 py-2 flex items-center gap-3 text-sm {tm.alive ? '' : 'opacity-70'}">
            <span class="text-xl leading-none shrink-0 {tm.alive ? '' : 'grayscale'}" aria-hidden="true">{t.flag}</span>
            <span class="flex-1 min-w-0 font-semibold truncate {tm.alive ? '' : 'line-through text-fg-faint'}">{t.name}</span>
            {#if tm.alive}
              <span class="type-kicker text-[10px] px-1.5 py-px rounded border" style:color="#4d94ff" style:border-color="color-mix(in srgb, #4d94ff 40%, transparent)">In</span>
            {:else if tm.exit?.type === 'knockout'}
              <span class="type-kicker text-live text-[10px] border border-live/40 rounded px-1.5 py-px">Out · {tm.exit.round}</span>
            {:else}
              <span class="type-kicker text-fg-faint text-[10px] border border-line rounded px-1.5 py-px">Out · Groups</span>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  {:else}
    {@const r = worst.find((w) => w.row.fifaCode === selected)}
    {@const rank = worst.findIndex((w) => w.row.fifaCode === selected) + 1}
    {@const timeline = teamResults(state, selected)}
    {@render backButton()}
    {#if r}
      {@const t = teamFor(r.row.fifaCode)}
      <div class="card clip-corner p-4 mb-4">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="text-3xl leading-none" aria-hidden="true">{t.flag}</span>
          <span class="type-display text-2xl">{t.name}</span>
          <span class="text-fg-mute text-sm tnum type-cond">
            {r.row.pts} pts · GD {r.row.gd >= 0 ? '+' : ''}{r.row.gd} · {r.row.gf} scored
          </span>
          {#if r.owner}<OwnerBadge employee={r.owner} size="sm" />{/if}
        </div>
        <p class="mt-2 text-sm text-fg-mute">
          {#if rank === 1}
            Currently bottom of the pile — holding the spoon 🥄.
          {:else}
            #{rank} from the bottom{#if r.eliminated}&nbsp;· eliminated{/if}.
          {/if}
        </p>
      </div>

      {#if timeline.length}
        <div class="flex items-baseline justify-between mb-2">
          <h3 class="type-kicker text-fg-mute kicker-slash">Results</h3>
          <span class="type-kicker text-fg-faint">pts · running total</span>
        </div>
        <ol class="space-y-1.5">
          {#each timeline as res, i (i)}
            {@const opp = teamFor(res.opponent)}
            <li class="card-raised px-3 py-2 flex items-center gap-3 text-sm">
              <span class="inline-flex items-center justify-center w-6 h-6 rounded type-display text-xs border {resultClasses(res.result)} shrink-0">{res.result}</span>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate tnum">
                  {res.gf}–{res.ga} vs {opp.flag} {opp.name}
                </div>
                <div class="text-xs text-fg-faint type-cond">
                  {#if res.round}{res.round} · {:else if res.match.group}Group {res.match.group} · {/if}{formatKickoff(res.match.utc)}
                </div>
              </div>
              <div class="text-right shrink-0 tnum">
                {#if res.points != null}
                  <span class="text-fg-faint text-xs">+{res.points}</span>
                  <span class="type-display text-base ml-2">{res.running}</span>
                {:else}
                  <span class="text-fg-faint text-xs">knockout</span>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="text-fg-faint text-sm">No completed games for {t.name} yet.</p>
      {/if}
    {/if}
  {/if}
</Modal>
