<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { banterLines } from '../lib/state/banter.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { dur } from '../lib/motion.js';

  let { state: snapshot, employees } = $props();

  const ROTATE_MS = 8000;

  const lines = $derived(banterLines(snapshot, employees));
  let tick = $state(0);
  const line = $derived(lines.length ? lines[tick % lines.length] : null);

  onMount(() => {
    const id = setInterval(() => (tick += 1), ROTATE_MS);
    return () => clearInterval(id);
  });
</script>

{#if line}
  <div class="px-3 sm:px-5 pb-1">
    <div class="card rounded-md pl-3 pr-1.5 py-1.5 flex items-center gap-2.5 overflow-hidden border-gold/25">
      <span class="type-kicker text-gold shrink-0 kicker-slash whitespace-nowrap">Banter Banner</span>
      {#key tick % Math.max(lines.length, 1)}
        <span in:fade={{ duration: dur(250) }} class="flex-1 min-w-0 truncate text-[13px] type-cond text-fg-mute" title={line}>
          {line}
        </span>
      {/key}
      <button
        type="button"
        class="pressable shrink-0 w-6 h-6 flex items-center justify-center rounded text-fg-faint hover:text-fg hover:bg-ink-3 leading-none"
        aria-label="Hide the Banter Banner"
        title="Hide the Banter Banner"
        onclick={() => ui.setBanterHidden(true)}
      >×</button>
    </div>
  </div>
{/if}
