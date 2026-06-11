<script>
  let { employee, size = 'md' } = $props();

  const sizes = {
    sm: 'text-[11px] px-1.5 py-px',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
    xl: 'text-xl px-3.5 py-1.5',
  };
</script>

{#if employee}
  <span
    class="inline-flex items-center gap-1.5 font-bold rounded type-cond uppercase tracking-wide {sizes[size]}"
    style:background="color-mix(in srgb, {employee.color} 16%, transparent)"
    style:border="1px solid color-mix(in srgb, {employee.color} 45%, transparent)"
    style:color={employee.color}
  >
    {employee.name}
  </span>
{:else}
  <span class="inline-flex items-center font-bold rounded type-cond uppercase tracking-wide bg-ink-3 border border-line text-fg-faint {sizes[size]}">
    —
  </span>
{/if}
