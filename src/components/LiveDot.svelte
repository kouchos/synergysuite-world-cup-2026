<script>
  let { label = 'LIVE' } = $props();
</script>

<span class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-200 uppercase tracking-wider">
  <span class="live-dot inline-block w-2 h-2 rounded-full bg-rose-500"></span>
  {label}
</span>
