<script>
  let { employee, size = 'md' } = $props();

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
    xl: 'text-2xl px-4 py-2',
  };
</script>

{#if employee}
  <span
    class="inline-flex items-center font-semibold rounded-full {sizes[size]}"
    style:background-color={employee.color}
    style:color="#ffffff"
  >
    {employee.name}
  </span>
{:else}
  <span class="inline-flex items-center font-semibold rounded-full bg-stone-700 text-stone-300 {sizes[size]}">
    —
  </span>
{/if}
