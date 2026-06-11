<script>
  let { label = 'LIVE' } = $props();
</script>

<span class="inline-flex items-center gap-1.5 type-kicker text-live">
  <span class="live-dot inline-block w-1.5 h-1.5 rounded-full bg-live"></span>
  {label}
</span>
