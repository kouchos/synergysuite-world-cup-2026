<script>
  import Bracket from '../components/Bracket.svelte';

  let { state, employees } = $props();

  const matches = $derived(state.knockoutMatches ?? []);
</script>

{#if matches.length}
  <Bracket {matches} {employees} />
{:else}
  <div class="px-3 sm:px-5 py-6">
    <div class="card clip-corner p-8 text-center">
      <h2 class="type-display text-2xl mb-2">Knockout ladder</h2>
      <p class="text-fg-mute text-sm">
        Bracket fills in here once the group stage finishes and Round of 32 fixtures are drawn.
      </p>
    </div>
  </div>
{/if}
