<script>
  import { teamFor } from '../lib/data/teams.js';
  import OwnerBadge from './OwnerBadge.svelte';

  let { fifaCode, employees, size = 'md', showOwner = true } = $props();

  const team = $derived(teamFor(fifaCode));
  const owner = $derived(
    employees?.find((e) => e.teams.some((t) => t.fifaCode === fifaCode)) ?? null
  );
  const pickInfo = $derived(
    owner?.teams.find((t) => t.fifaCode === fifaCode) ?? null
  );

  const flagClass = $derived(
    { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-5xl' }[size]
  );
  const nameClass = $derived(
    { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-2xl' }[size]
  );
</script>

<span class="inline-flex items-center gap-2">
  <span class={flagClass} aria-hidden="true">{team.flag}</span>
  <span class="{nameClass} font-medium">{team.name}</span>
  {#if pickInfo?.topTier}
    <span class="text-amber-300" title="Top-tier pick" aria-label="Top-tier pick">★</span>
  {/if}
  {#if showOwner && owner}
    <OwnerBadge employee={owner} size={size === 'xl' ? 'md' : 'sm'} />
  {/if}
</span>
