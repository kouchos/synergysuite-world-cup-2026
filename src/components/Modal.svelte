<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { modal } from '../lib/state/modal.svelte.js';
  import { dur } from '../lib/motion.js';

  let { title, accentColor = '#c8f542', children } = $props();

  function handleKeydown(e) {
    if (e.key === 'Escape') modal.close();
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) modal.close();
  }

  onMount(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
  onclick={handleBackdrop}
  transition:fade={{ duration: dur(140) }}
  role="presentation"
>
  <!-- Bottom sheet on phones, centered dialog on bigger screens -->
  <div
    class="max-w-4xl w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col bg-ink-2 border border-line rounded-t-2xl sm:rounded-xl shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    transition:fly={{ duration: dur(220), y: 28, opacity: 0 }}
  >
    <div class="h-1 shrink-0" style:background="linear-gradient(90deg, {accentColor}, color-mix(in srgb, {accentColor} 25%, transparent))"></div>
    <header class="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-line shrink-0">
      <h2 id="modal-title" class="type-display text-xl sm:text-2xl">{title}</h2>
      <button
        type="button"
        onclick={() => modal.close()}
        class="pressable text-fg-mute hover:text-fg text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-ink-3"
        aria-label="Close"
      >×</button>
    </header>
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
      {@render children?.()}
    </div>
  </div>
</div>
