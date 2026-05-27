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

<div class="overflow-x-auto px-4 py-2">
  <div class="flex gap-3 min-w-fit">
    {#each rounds as round (round.id)}
      {@const list = byRound(round.id)}
      <section class="flex flex-col min-w-[200px] flex-1">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-emerald-200/70 mb-2 text-center">
          {round.label}
        </h3>
        <div class="flex-1 flex flex-col justify-around gap-1.5">
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
