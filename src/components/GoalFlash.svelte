<script>
  import { fade, scale } from 'svelte/transition';
  import { teamFor, TEAMS } from '../lib/data/teams.js';
  import { celebrations } from '../lib/state/celebrations.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { dur, reducedMotion } from '../lib/motion.js';
  import OwnerBadge from './OwnerBadge.svelte';

  function dismissKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      celebrations.dismiss();
    }
  }

  const c = $derived(celebrations.current);
  const team = $derived(c && TEAMS[c.team] ? teamFor(c.team) : null);
  const ht = $derived(c?.match?.home && TEAMS[c.match.home] ? teamFor(c.match.home) : null);
  const at = $derived(c?.match?.away && TEAMS[c.match.away] ? teamFor(c.match.away) : null);
  const accent = $derived(c?.owner?.color ?? '#c8f542');

  const CONFETTI_COLORS = ['#c8f542', '#f2c14e', '#f2f4f8'];
  const pieces = $derived.by(() => {
    if (!c || reducedMotion) return [];
    return Array.from({ length: 60 }, (_, i) => ({
      i,
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      fall: 2 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 30,
      size: 6 + Math.random() * 7,
      color: i % 3 === 0 ? accent : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }));
  });
</script>

{#if c && team}
  <!-- Click anywhere to dismiss early; auto-dismisses after a few seconds. -->
  <div
    role="button"
    tabindex="0"
    class="fixed inset-0 z-[70] w-full cursor-pointer overflow-hidden flex items-center justify-center"
    style:background="radial-gradient(120% 120% at 50% 110%, color-mix(in srgb, {accent} 30%, rgba(10,12,16,0.92)), rgba(10,12,16,0.92) 70%)"
    transition:fade={{ duration: dur(180) }}
    onclick={() => celebrations.dismiss()}
    onkeydown={dismissKeydown}
    aria-label="Dismiss goal celebration"
  >
    <button
      type="button"
      class="absolute top-4 right-4 z-10 pressable w-10 h-10 flex items-center justify-center rounded-lg bg-ink-2/70 border border-line text-lg"
      aria-label={ui.hornMuted ? 'Unmute goal horn' : 'Mute goal horn'}
      title={ui.hornMuted ? 'Unmute goal horn' : 'Mute goal horn'}
      onclick={(e) => {
        e.stopPropagation();
        ui.setHornMuted(!ui.hornMuted);
      }}
    >{ui.hornMuted ? '🔇' : '🔊'}</button>
    {#each pieces as p (p.i)}
      <span
        class="confetti"
        style:left="{p.left}%"
        style:width="{p.size}px"
        style:height="{p.size * 1.6}px"
        style:background-color={p.color}
        style:animation-delay="{p.delay}s"
        style:animation-duration="{p.fall}s"
        style:--drift="{p.drift}vw"
        aria-hidden="true"
      ></span>
    {/each}

    <div class="text-center px-6" in:scale={{ duration: dur(300), start: 0.7 }}>
      <div class="type-display leading-none text-[clamp(4rem,16vw,9rem)]" style:color={accent}>GOAL!</div>
      <div class="mt-4 flex items-center justify-center gap-3">
        <span class="text-5xl sm:text-6xl leading-none" aria-hidden="true">{team.flag}</span>
        <span class="type-display text-3xl sm:text-5xl leading-[0.9]">{team.name}</span>
      </div>
      {#if ht && at && c.match.homeGoals != null}
        <div class="mt-4 type-display text-2xl sm:text-3xl tnum text-fg">
          {ht.flag} {c.match.homeGoals}<span class="text-fg-faint mx-1.5 not-italic">–</span>{c.match.awayGoals} {at.flag}
          {#if c.match.minute}<span class="text-fg-mute text-xl ml-2">{c.match.minute}'</span>{/if}
        </div>
      {/if}
      {#if c.owner}
        <div class="mt-5 inline-flex items-center gap-2.5">
          <OwnerBadge employee={c.owner} size="lg" />
          <span class="text-fg-mute text-sm">cashes in</span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .confetti {
    position: absolute;
    top: -6vh;
    border-radius: 2px;
    opacity: 0;
    animation-name: confetti-fall;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }
  @keyframes confetti-fall {
    0% {
      transform: translateY(0) translateX(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(115vh) translateX(var(--drift, 0)) rotate(540deg);
      opacity: 0.7;
    }
  }
</style>
