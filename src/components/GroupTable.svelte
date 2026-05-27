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

<div class="rounded-xl bg-pitch-light/40 ring-1 ring-white/10 p-3">
  <div class="text-emerald-100/80 text-xs font-bold uppercase tracking-widest mb-2">Group {group.id}</div>
  <table class="w-full text-sm">
    <thead>
      <tr class="text-stone-300/70 text-left">
        <th class="font-medium pb-1 pl-3">Team</th>
        <th class="font-medium pb-1 text-right w-6">P</th>
        <th class="font-medium pb-1 text-right w-6">W</th>
        <th class="font-medium pb-1 text-right w-6">D</th>
        <th class="font-medium pb-1 text-right w-6">L</th>
        <th class="font-medium pb-1 text-right w-8">GD</th>
        <th class="font-medium pb-1 text-right w-8">Pts</th>
      </tr>
    </thead>
    <tbody>
      {#each group.standings as row (row.fifaCode)}
        {@const team = teamFor(row.fifaCode)}
        {@const owner = ownerOf(row.fifaCode)}
        {@const pick = pickInfo(owner, row.fifaCode)}
        <tr
          class="border-t border-white/5 group/row {store.espnReachable ? 'hover:bg-pitch/40 cursor-pointer' : ''}"
          onclick={() => openTeam(row.fifaCode)}
        >
          <td class="py-1.5 pl-0 relative">
            <button
              type="button"
              class="absolute left-0 top-1 bottom-1 w-1 rounded-sm hover:w-1.5 transition-all"
              style:background-color={owner?.color ?? 'transparent'}
              title={owner?.name ?? ''}
              aria-label={owner ? `Open ${owner.name}'s page` : ''}
              onclick={(e) => openOwner(owner, e)}
            ></button>
            <span class="inline-flex items-center gap-2 pl-3">
              <span class="text-xl" aria-hidden="true">{team.flag}</span>
              <span class="font-medium group-hover/row:underline decoration-1 underline-offset-2">{team.name}</span>
              {#if pick?.topTier}
                <span class="text-amber-300" title="Top-tier pick" aria-label="Top-tier pick">★</span>
              {/if}
            </span>
          </td>
          <td class="text-right tabular-nums">{row.p}</td>
          <td class="text-right tabular-nums">{row.w}</td>
          <td class="text-right tabular-nums">{row.d}</td>
          <td class="text-right tabular-nums">{row.l}</td>
          <td class="text-right tabular-nums">{row.gd >= 0 ? '+' : ''}{row.gd}</td>
          <td class="text-right tabular-nums font-semibold">{row.pts}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
