<script>
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { modal } from '../lib/state/modal.svelte.js';

  let { title, accentColor = '#10b981', children } = $props();

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
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  onclick={handleBackdrop}
  transition:fade={{ duration: 150 }}
  role="presentation"
>
  <div
    class="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-pitch-light/95 ring-1 ring-white/15 rounded-2xl shadow-2xl"
    style:border-top="4px solid {accentColor}"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    transition:scale={{ duration: 180, start: 0.96 }}
  >
    <header class="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
      <h2 id="modal-title" class="text-2xl font-bold text-white">{title}</h2>
      <button
        type="button"
        onclick={() => modal.close()}
        class="text-stone-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
        aria-label="Close"
      >×</button>
    </header>
    <div class="flex-1 overflow-y-auto p-6">
      {@render children?.()}
    </div>
  </div>
</div>
