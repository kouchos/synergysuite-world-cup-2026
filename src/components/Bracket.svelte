<script>
  import BracketMatch from './BracketMatch.svelte';

  let { matches, employees } = $props();

  const rounds = [
    { id: 'R32',   label: 'Round of 32' },
    { id: 'R16',   label: 'Round of 16' },
    { id: 'QF',    label: 'Quarter-finals' },
    { id: 'SF',    label: 'Semi-finals' },
    { id: 'Final', label: 'Final' },
  ];

  function byRound(id) {
    return (matches ?? []).filter((m) => m.round === id).sort((a, b) => a.slot - b.slot);
  }

  const thirdPlace = $derived((matches ?? []).find((m) => m.round === 'Third'));
</script>

<!-- Horizontal snap scroll on small screens; full spread on desktop. -->
<div class="overflow-x-auto px-3 sm:px-5 py-3 bracket-root snap-x snap-mandatory lg:snap-none">
  <div class="flex gap-4 min-w-fit">
    {#each rounds as round, i (round.id)}
      {@const list = byRound(round.id)}
      {@const isFirst = i === 0}
      {@const isLast = i === rounds.length - 1}
      <section
        class="bracket-col flex flex-col min-w-[200px] sm:min-w-[190px] flex-1 snap-start rise-in"
        class:bracket-col-first={isFirst}
        class:bracket-col-last={isLast}
        style:--stagger={`${i * 50}ms`}
      >
        <h3 class="type-kicker text-center mb-2.5 py-1.5 rounded {list.some((m) => m.status === 'live') ? 'bg-live/15 text-live' : 'bg-ink-2 text-fg-mute'}">
          {round.label}
        </h3>
        <div class="flex-1 flex flex-col justify-around gap-1.5">
          {#each list as m (m.id)}
            <BracketMatch match={m} {employees} />
          {/each}
        </div>

        {#if round.id === 'Final' && thirdPlace}
          <div class="mt-4 pt-3 border-t border-line">
            <h4 class="type-kicker text-fg-faint mb-2 text-center">
              Third place
            </h4>
            <BracketMatch match={thirdPlace} {employees} />
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>

<!-- Swipe hint, mobile only -->
<p class="lg:hidden px-3 pb-2 -mt-1 text-[11px] type-cond text-fg-faint text-center" aria-hidden="true">
  ← swipe across the rounds →
</p>

<style>
  /* Connector ticks on each bracket cell — pure CSS, no SVG. The eye fills
     in the cascade because each round's matches center between the pair from
     the previous round (flex justify-around handles the spacing for us). */
  .bracket-col :global(.bracket-cell)::before,
  .bracket-col :global(.bracket-cell)::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 0.5rem; /* matches half of gap-4 (1rem) */
    height: 1px;
    background: var(--color-line);
  }
  .bracket-col :global(.bracket-cell)::before { left: -0.5rem; }
  .bracket-col :global(.bracket-cell)::after  { right: -0.5rem; }
  /* Hide the inward tick on the first column (nothing feeds into R32) and the
     outward tick on the Final column. */
  .bracket-col-first :global(.bracket-cell)::before,
  .bracket-col-last  :global(.bracket-cell)::after {
    display: none;
  }
</style>
