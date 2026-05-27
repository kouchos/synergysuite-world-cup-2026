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

<div class="overflow-x-auto px-4 py-2 bracket-root">
  <div class="flex gap-4 min-w-fit">
    {#each rounds as round, i (round.id)}
      {@const list = byRound(round.id)}
      {@const isFirst = i === 0}
      {@const isLast = i === rounds.length - 1}
      <section
        class="bracket-col flex flex-col min-w-[180px] flex-1"
        class:bracket-col-first={isFirst}
        class:bracket-col-last={isLast}
      >
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-emerald-200/70 mb-2 text-center">
          {round.label}
        </h3>
        <div class="flex-1 flex flex-col justify-around gap-1">
          {#each list as m (m.id)}
            <BracketMatch match={m} {employees} />
          {/each}
        </div>

        {#if round.id === 'Final' && thirdPlace}
          <div class="mt-4 pt-3 border-t border-white/10">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-stone-300/70 mb-2 text-center">
              Third place
            </h4>
            <BracketMatch match={thirdPlace} {employees} />
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>

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
    background: rgba(255, 255, 255, 0.18);
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
