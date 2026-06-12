<script>
  import { onMount } from 'svelte';
  import { reducedMotion } from '../lib/motion.js';

  // The office rebrand bit: load as "SynergySuite Sweepstake", backspace to
  // "Synergy", then type "Sweep" — landing on "SynergySweep".
  const KEEP = 'Synergy';
  const DELETE_TAIL = 'Suite Sweepstake';
  const TYPE_TAIL = 'Sweep';

  const START_DELAY = 1400; // let the page settle before the gag starts
  const DELETE_MS = 55; // backspace key-repeat pace
  const PAUSE_MS = 400; // beat between deleting and retyping
  const TYPE_MS = 130; // human typing — a touch slower than deleting

  let plainTail = $state(reducedMotion ? '' : DELETE_TAIL);
  let typed = $state(reducedMotion ? TYPE_TAIL : '');
  let animating = $state(false);

  onMount(() => {
    if (reducedMotion) return;
    let cancelled = false;
    const timers = [];
    const wait = (ms) => new Promise((resolve) => timers.push(setTimeout(resolve, ms)));
    (async () => {
      await wait(START_DELAY);
      animating = true;
      while (plainTail.length && !cancelled) {
        await wait(DELETE_MS);
        plainTail = plainTail.slice(0, -1);
      }
      await wait(PAUSE_MS);
      for (const ch of TYPE_TAIL) {
        if (cancelled) return;
        typed += ch;
        await wait(TYPE_MS);
      }
      animating = false;
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  });
</script>

<!-- Screen readers get the final name; the keystroke churn is visual-only. -->
<div class="type-display text-[15px] leading-none" aria-label="{KEEP}{TYPE_TAIL}">
  <span aria-hidden="true">{KEEP}{plainTail}<span class="text-volt">{typed}</span>{#if animating}<span class="caret"></span>{/if}</span>
</div>

<style>
  .caret {
    display: inline-block;
    width: 2px;
    height: 0.95em;
    margin-left: 1px;
    vertical-align: -0.12em;
    background: var(--color-volt);
    animation: caret-blink 0.9s steps(1) infinite;
  }
  @keyframes caret-blink {
    50% {
      opacity: 0;
    }
  }
</style>
