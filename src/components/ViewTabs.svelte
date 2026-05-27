<script>
  let { value, phase, onSelect } = $props();

  const tabs = [
    { id: 'group', label: 'Pool stage' },
    { id: 'knockout', label: 'Knockout ladder' },
    { id: 'winners', label: 'Winners' },
  ];
</script>

<nav class="flex gap-2 px-4 pb-2" aria-label="Switch view">
  {#each tabs as tab (tab.id)}
    {@const active = value === tab.id}
    {@const auto = phase === tab.id && value === tab.id}
    <button
      type="button"
      onclick={() => onSelect(tab.id)}
      class="px-4 py-2 rounded-full text-sm font-semibold transition-colors
        {active ? 'bg-emerald-400 text-emerald-950' : 'bg-white/10 text-white/80 hover:bg-white/20'}"
    >
      {tab.label}
      {#if auto}
        <span class="ml-1 text-[10px] opacity-70 uppercase tracking-wider">auto</span>
      {/if}
    </button>
  {/each}
</nav>
