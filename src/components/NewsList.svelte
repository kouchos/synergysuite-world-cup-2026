<script>
  // Renders normalised news articles (see adapter.normaliseNews). Every
  // article is an external espn.com link — always opened in a new tab.
  let { articles = [] } = $props();

  function fmtDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(+d)) return null;
    return d.toLocaleDateString('en-IE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Dublin',
    });
  }
</script>

<div class="space-y-2">
  {#each articles as a (a.id)}
    <a
      class="card-raised lift flex gap-3 p-3 text-left"
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {#if a.image}
        <img
          src={a.image}
          alt=""
          loading="lazy"
          class="w-20 h-14 sm:w-28 sm:h-[4.5rem] object-cover rounded-md shrink-0"
        />
      {/if}
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm leading-snug">{a.headline}</div>
        {#if a.description}
          <p class="text-fg-mute text-xs mt-1 line-clamp-2">{a.description}</p>
        {/if}
        <div class="mt-1.5 text-[11px] text-fg-faint type-cond flex items-center gap-1.5">
          {#if a.tag}<span aria-hidden="true">{a.tag}</span>{/if}
          {#if fmtDate(a.published)}<span>{fmtDate(a.published)}</span>{/if}
          {#if a.byline}<span class="truncate">· {a.byline}</span>{/if}
          <span class="ml-auto shrink-0 inline-flex items-center gap-1">espn.com <span aria-hidden="true">↗</span></span>
        </div>
      </div>
    </a>
  {/each}
</div>
