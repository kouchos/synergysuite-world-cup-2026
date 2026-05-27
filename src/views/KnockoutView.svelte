<script>
  import Bracket from '../components/Bracket.svelte';

  let { state, employees } = $props();

  const matches = $derived(state.knockoutMatches ?? []);
</script>

{#if matches.length}
  <Bracket {matches} {employees} />
{:else}
  <div class="p-8 text-stone-200/80">
    <h2 class="text-2xl font-bold mb-2">Knockout ladder</h2>
    <p class="italic text-stone-300/70">
      Bracket fills in here once the group stage finishes and Round of 32 fixtures are drawn.
    </p>
  </div>
{/if}
