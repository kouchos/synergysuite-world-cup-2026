<script>
  import { flip } from 'svelte/animate';
  import { overallLeaderboard } from '../lib/state/prizes.js';
  import { modal } from '../lib/state/modal.svelte.js';
  import { dur } from '../lib/motion.js';

  let { state: snapshot, employees } = $props();

  const board = $derived(overallLeaderboard(snapshot, employees));
</script>

<!-- The chase: all 8 players ranked, not just the leader. -->
<div class="px-3 sm:px-5 pb-1">
  <div class="flex items-center gap-2 overflow-x-auto pb-1.5 -mb-1.5">
    <span class="type-kicker text-fg-faint whitespace-nowrap shrink-0 kicker-slash">The race</span>
    {#each board as row, i (row.employee.id)}
      <button
        type="button"
        animate:flip={{ duration: dur(450) }}
        onclick={() => modal.employee(row.employee.id)}
        class="pressable shrink-0 flex items-center gap-2 card rounded-md pl-0 pr-2.5 py-1 overflow-hidden"
        style:border-color={i === 0 ? `color-mix(in srgb, ${row.employee.color} 60%, transparent)` : undefined}
      >
        <span class="self-stretch w-1" style:background-color={row.employee.color} aria-hidden="true"></span>
        <span class="type-display text-xs {i === 0 ? 'text-volt' : 'text-fg-faint'}">{i + 1}</span>
        <span class="font-bold text-[13px] leading-none">{row.employee.name}</span>
        <span class="type-cond text-xs text-fg-mute tnum leading-none">{row.pts} pts</span>
      </button>
    {/each}
  </div>
</div>
