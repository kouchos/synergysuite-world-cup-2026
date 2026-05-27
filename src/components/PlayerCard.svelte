<script>
  let { player, compact = false } = $props();

  let imgOk = $state(true);
</script>

<div class="flex items-center gap-3 rounded-lg bg-pitch/40 ring-1 ring-white/5 px-3 py-2 {compact ? '' : 'min-h-[3.5rem]'}">
  {#if player.headshot && imgOk}
    <img
      src={player.headshot}
      alt=""
      class="{compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-full object-cover bg-pitch-light/30 flex-shrink-0"
      loading="lazy"
      onerror={() => (imgOk = false)}
    />
  {:else}
    <div class="{compact ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm'} rounded-full bg-pitch-light/40 ring-1 ring-white/10 flex items-center justify-center text-stone-300 font-semibold flex-shrink-0">
      {player.name?.split(' ').slice(-1)[0]?.[0] ?? '?'}
    </div>
  {/if}
  <div class="min-w-0 flex-1">
    <div class="font-semibold truncate {compact ? 'text-sm' : ''}">{player.name}</div>
    <div class="text-xs text-stone-400 tabular-nums flex items-center gap-1.5">
      {#if player.jersey}<span>#{player.jersey}</span>{/if}
      {#if player.position}<span class="text-stone-500">·</span><span>{player.position}</span>{/if}
    </div>
  </div>
</div>
