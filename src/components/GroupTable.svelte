<script>
  import TeamChip from './TeamChip.svelte';

  let { group, employees } = $props();
</script>

<div class="rounded-xl bg-pitch-light/40 ring-1 ring-white/10 p-3">
  <div class="text-emerald-100/80 text-xs font-bold uppercase tracking-widest mb-2">Group {group.id}</div>
  <table class="w-full text-sm">
    <thead>
      <tr class="text-stone-300/70 text-left">
        <th class="font-medium pb-1">Team</th>
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
        <tr class="border-t border-white/5">
          <td class="py-1.5"><TeamChip fifaCode={row.fifaCode} {employees} size="sm" /></td>
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
