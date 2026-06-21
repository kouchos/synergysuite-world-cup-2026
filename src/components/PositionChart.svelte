<script>
  import { onMount } from 'svelte';
  import { reducedMotion } from '../lib/motion.js';

  // frames: [{ key, label }]                      — x-axis, oldest → newest
  // lines:  [{ id, label, flag?, color, ranks }]  — ranks[] aligned to frames, 1 = top
  // rankCount: number of rows (y-axis scale)
  let { frames = [], lines = [], rankCount = 0, accent = '#c8f542' } = $props();

  const PAD = { top: 14, bottom: 24, left: 26, right: 128 };
  const ROW = 30; // px between adjacent ranks

  let width = $state(680);
  const rows = $derived(Math.max(1, rankCount));
  const height = $derived(PAD.top + PAD.bottom + (rows - 1) * ROW);
  const plotW = $derived(Math.max(40, width - PAD.left - PAD.right));
  const plotH = $derived(Math.max(ROW, (rows - 1) * ROW));
  const F = $derived(frames.length);

  function xAt(i) {
    return PAD.left + (F <= 1 ? plotW / 2 : (i * plotW) / (F - 1));
  }
  function yAt(rank) {
    return PAD.top + (rows <= 1 ? plotH / 2 : ((rank - 1) * plotH) / (rows - 1));
  }

  // ── Reveal animation ────────────────────────────────────────────────────────
  // `progress` walks 0 → F-1; lines draw up to it and their heads ride the front.
  let progress = $state(0);
  let raf = 0;

  function play() {
    cancelAnimationFrame(raf);
    if (F <= 1 || reducedMotion) {
      progress = Math.max(0, F - 1);
      return;
    }
    const total = Math.min(6500, 1200 + F * 70);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / total);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      progress = eased * (F - 1);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  onMount(() => {
    play();
    return () => cancelAnimationFrame(raf);
  });

  // Replay whenever the dataset changes (e.g. fresh sync while open).
  let lastKey = '';
  $effect(() => {
    const key = `${F}:${lines.length}:${frames[0]?.key ?? ''}`;
    if (key !== lastKey) {
      lastKey = key;
      play();
    }
  });

  function linePath(ranks, p) {
    if (!ranks.length) return '';
    const i0 = Math.min(Math.floor(p), ranks.length - 1);
    let d = '';
    for (let i = 0; i <= i0; i++) d += `${i === 0 ? 'M' : 'L'}${xAt(i)} ${yAt(ranks[i])}`;
    if (i0 < ranks.length - 1) {
      const frac = p - i0;
      d += `L${xAt(i0) + (xAt(i0 + 1) - xAt(i0)) * frac} ${yAt(ranks[i0]) + (yAt(ranks[i0 + 1]) - yAt(ranks[i0])) * frac}`;
    }
    return d;
  }
  function headPos(ranks, p) {
    if (!ranks.length) return { x: xAt(0), y: yAt(1) };
    const i0 = Math.min(Math.floor(p), ranks.length - 1);
    if (i0 >= ranks.length - 1) {
      const last = ranks.length - 1;
      return { x: xAt(last), y: yAt(ranks[last]) };
    }
    const frac = p - i0;
    return {
      x: xAt(i0) + (xAt(i0 + 1) - xAt(i0)) * frac,
      y: yAt(ranks[i0]) + (yAt(ranks[i0 + 1]) - yAt(ranks[i0])) * frac,
    };
  }

  const headFrame = $derived(Math.min(Math.round(progress), F - 1));
  const currentLabel = $derived(frames[headFrame]?.label ?? '');
</script>

<div class="w-full" bind:clientWidth={width}>
  <div class="flex items-center justify-between mb-1.5">
    <span class="type-cond text-xs text-fg-faint tnum">
      {#if F > 1}{frames[0]?.label} → {currentLabel}{:else}{currentLabel}{/if}
    </span>
    <button
      type="button"
      class="pressable type-kicker text-[10px] text-fg-faint hover:text-fg inline-flex items-center gap-1"
      onclick={play}
      aria-label="Replay the position animation"
    >↻ replay</button>
  </div>

  {#if F >= 1 && rankCount >= 1}
    <svg
      {width}
      {height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Chart of each player's leaderboard position after every game"
    >
      <!-- Rank gridlines + numbers -->
      {#each Array(rows) as _, r (r)}
        <line x1={PAD.left} x2={width - PAD.right + 8} y1={yAt(r + 1)} y2={yAt(r + 1)} stroke="currentColor" class="text-line/50" stroke-width="1" />
        <text x={PAD.left - 8} y={yAt(r + 1)} text-anchor="end" dominant-baseline="central" class="fill-fg-faint type-display" font-size="11">{r + 1}</text>
      {/each}

      <!-- Position lines -->
      {#each lines as line (line.id)}
        {@const head = headPos(line.ranks, progress)}
        <path
          d={linePath(line.ranks, progress)}
          fill="none"
          stroke={line.color}
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          opacity="0.9"
        />
        <circle cx={head.x} cy={head.y} r="4.5" fill={line.color} stroke="var(--color-ink-2)" stroke-width="1.5" />
        <text
          x={Math.min(head.x + 9, width - PAD.right + 12)}
          y={head.y}
          dominant-baseline="central"
          font-size="12"
          class="type-cond"
          fill={line.color}
          style="paint-order: stroke; stroke: var(--color-ink-2); stroke-width: 3px;"
        >{line.flag ? `${line.flag} ` : ''}{line.label}</text>
      {/each}
    </svg>
  {/if}
</div>
