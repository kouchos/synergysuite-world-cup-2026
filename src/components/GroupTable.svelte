<script>
  import { teamFor, TEAMS } from '../lib/data/teams.js';
  import { modal } from '../lib/state/modal.svelte.js';
  import { store } from '../lib/state/store.svelte.js';

  let { group, employees } = $props();

  function ownerOf(code) {
    return employees?.find((e) => e.teams.some((t) => t.fifaCode === code)) ?? null;
  }
  function pickInfo(emp, code) {
    return emp?.teams.find((t) => t.fifaCode === code) ?? null;
  }
  function openTeam(code) {
    if (store.espnReachable && TEAMS[code]) modal.team(code);
  }
  function openOwner(emp, e) {
    if (emp) {
      e.stopPropagation();
      modal.employee(emp.id);
    }
  }
</script>

<div class="card overflow-hidden" data-group={group.id}>
  <div class="flex items-baseline gap-2 px-3 pt-2.5 pb-1.5 border-b border-line">
    <span class="type-kicker text-fg-faint">Group</span>
    <span class="type-display text-xl text-volt leading-none">{group.id}</span>
  </div>
  <table class="w-full text-sm">
    <thead>
      <tr class="type-kicker text-fg-faint text-left">
        <th class="font-[650] py-1.5 pl-3" scope="col">Team</th>
        <th class="font-[650] py-1.5 text-right w-6" scope="col">P</th>
        <th class="font-[650] py-1.5 text-right w-6" scope="col">W</th>
        <th class="font-[650] py-1.5 text-right w-6" scope="col">D</th>
        <th class="font-[650] py-1.5 text-right w-6" scope="col">L</th>
        <th class="font-[650] py-1.5 text-right w-9 pr-1" scope="col">GD</th>
        <th class="font-[650] py-1.5 text-right w-10 pr-3" scope="col">Pts</th>
      </tr>
    </thead>
    <tbody>
      {#each group.standings as row (row.fifaCode)}
        {@const team = teamFor(row.fifaCode)}
        {@const owner = ownerOf(row.fifaCode)}
        {@const pick = pickInfo(owner, row.fifaCode)}
        <tr
          class="border-t border-line/60 group/row {store.espnReachable ? 'hover:bg-ink-3 cursor-pointer' : ''} transition-colors"
          onclick={() => openTeam(row.fifaCode)}
        >
          <td class="py-1.5 pl-0 relative">
            <button
              type="button"
              class="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 transition-all"
              style:background-color={owner?.color ?? 'transparent'}
              title={owner?.name ?? ''}
              aria-label={owner ? `Open ${owner.name}'s page` : ''}
              onclick={(e) => openOwner(owner, e)}
            ></button>
            <span class="inline-flex items-center gap-2 pl-3">
              <span class="text-lg leading-none" aria-hidden="true">{team.flag}</span>
              <button
                type="button"
                class="font-semibold text-[13px] group-hover/row:text-volt transition-colors text-left"
                onclick={(e) => { e.stopPropagation(); openTeam(row.fifaCode); }}
                disabled={!store.espnReachable}
              >{team.name}</button>
              {#if pick?.topTier}
                <span class="text-gold text-xs" title="Top-tier pick" aria-label="Top-tier pick">★</span>
              {/if}
            </span>
          </td>
          <td class="text-right tnum type-cond text-fg-mute">{row.p}</td>
          <td class="text-right tnum type-cond text-fg-mute">{row.w}</td>
          <td class="text-right tnum type-cond text-fg-mute">{row.d}</td>
          <td class="text-right tnum type-cond text-fg-mute">{row.l}</td>
          <td class="text-right tnum type-cond text-fg-mute pr-1">{row.gd >= 0 ? '+' : ''}{row.gd}</td>
          <td class="text-right tnum type-display text-sm pr-3 text-fg">{row.pts}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
