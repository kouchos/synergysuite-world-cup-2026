<script>
  let { value, phase, onSelect } = $props();

  const tabs = [
    { id: 'group', label: 'Pool stage' },
    { id: 'knockout', label: 'Knockout ladder' },
    { id: 'winners', label: 'Winners' },
  ];
</script>

<nav class="px-3 sm:px-5 pb-2" aria-label="Switch view">
  <div class="inline-flex p-1 gap-1 card rounded-lg max-w-full overflow-x-auto">
    {#each tabs as tab (tab.id)}
      {@const active = value === tab.id}
      {@const auto = phase === tab.id && value === tab.id}
      <button
        type="button"
        onclick={() => onSelect(tab.id)}
        aria-current={active ? 'true' : undefined}
        data-active={active || undefined}
        class="pressable px-3.5 py-1.5 rounded-md type-display text-[13px] whitespace-nowrap
          {active ? 'bg-volt text-ink' : 'text-fg-mute hover:text-fg'}"
      >
        {tab.label}
        {#if auto}
          <span class="ml-1.5 text-[9px] tracking-[0.18em] opacity-60 not-italic font-bold align-middle">auto</span>
        {/if}
      </button>
    {/each}
  </div>
</nav>
