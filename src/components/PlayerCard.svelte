<script>
  let { player, compact = false } = $props();

  let imgOk = $state(true);
</script>

<div class="flex items-center gap-3 card lift px-3 py-2 {compact ? '' : 'min-h-[3.5rem]'}">
  {#if player.headshot && imgOk}
    <img
      src={player.headshot}
      alt=""
      class="{compact ? 'w-8 h-8' : 'w-11 h-11'} rounded-full object-cover bg-ink-4 shrink-0"
      loading="lazy"
      onerror={() => (imgOk = false)}
    />
  {:else}
    <div class="{compact ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm'} rounded-full bg-ink-4 border border-line flex items-center justify-center text-fg-mute type-display shrink-0">
      {player.name?.split(' ').slice(-1)[0]?.[0] ?? '?'}
    </div>
  {/if}
  <div class="min-w-0 flex-1">
    <div class="font-semibold truncate {compact ? 'text-sm' : 'text-[15px]'}">{player.name}</div>
    <div class="text-xs text-fg-faint tnum type-cond flex items-center gap-1.5">
      {#if player.jersey}<span>#{player.jersey}</span>{/if}
      {#if player.position}<span>·</span><span>{player.position}</span>{/if}
    </div>
  </div>
</div>
