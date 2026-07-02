<script module>
  // Svelte 5 defers a destroyed component's cleanup (and thus onMount's
  // teardown) until its out-transition finishes. When navigating modal→modal
  // the {:else if} chain in App.svelte briefly mounts the new Modal while the
  // old one is still playing its ~220ms fly outro, so two instances overlap.
  // A plain per-instance save/restore of body overflow gets the ordering
  // wrong (new mount captures 'hidden' from the still-open old modal, old
  // teardown then restores '' underneath the new one). A module-level
  // refcount fixes it: only the 0→1 mount and the N→0 teardown touch the
  // DOM/focus, so nested opens during an outro overlap are no-ops.
  let lockCount = 0;
  let savedOverflow = '';
  let savedFocus = null;
  // Only the most recently mounted modal instance runs the focus trap, so
  // the outgoing instance (mid-outro, still in the DOM) doesn't fight the
  // incoming one for Tab handling.
  let topToken = 0;
</script>

<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { modal } from '../lib/state/modal.svelte.js';
  import { dur } from '../lib/motion.js';

  let { title, accentColor = '#c8f542', children } = $props();

  let panelEl;
  let myToken = 0;

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function trapFocus(e) {
    if (myToken !== topToken || !panelEl) return;
    const focusables = panelEl.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!panelEl.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      modal.close();
      return;
    }
    if (e.key === 'Tab') trapFocus(e);
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) modal.close();
  }

  onMount(() => {
    myToken = ++topToken;
    lockCount++;
    if (lockCount === 1) {
      savedOverflow = document.body.style.overflow;
      savedFocus = document.activeElement;
      document.body.style.overflow = 'hidden';
    }
    panelEl?.focus({ preventScroll: true });

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
        if (savedFocus?.isConnected) savedFocus.focus?.();
      }
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
    bind:this={panelEl}
    tabindex="-1"
    class="max-w-4xl w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col bg-ink-2 border border-line rounded-t-2xl sm:rounded-xl shadow-2xl focus:outline-none"
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
