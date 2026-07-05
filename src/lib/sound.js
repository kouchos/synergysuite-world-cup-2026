/**
 * Synthesised celebration sounds — no audio assets needed. Browsers block
 * audio until the user has interacted with the page; failures are swallowed.
 *
 * Two moods: the air horn for actual football, and a sad trombone for
 * England goals (editorial policy: see banter.js).
 */
let ctx = null;

function audioContext() {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function airHorn() {
  try {
    const ac = audioContext();
    if (!ac) return;

    const t = ac.currentTime;
    const gain = ac.createGain();
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.04);
    gain.gain.setValueAtTime(0.3, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);

    // The BWAAAH: slight upward scoop on attack, sag at the end.
    for (const [freq, type, detune] of [
      [440, 'sawtooth', 0],
      [440, 'square', 9],
      [220, 'sawtooth', -7],
    ]) {
      const osc = ac.createOscillator();
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(freq * 0.97, t);
      osc.frequency.linearRampToValueAtTime(freq, t + 0.09);
      osc.frequency.linearRampToValueAtTime(freq * 0.93, t + 0.95);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 1.05);
    }
  } catch {
    // no audio available — the goal flash still does the talking
  }
}

/**
 * Wah, wah, wah, wommmp — four descending notes, the last one sagging flat
 * with a mournful wobble. Played instead of the air horn when England score:
 * the horn refuses to celebrate on principle.
 */
export function sadTrombone() {
  try {
    const ac = audioContext();
    if (!ac) return;

    const t = ac.currentTime;
    const master = ac.createGain();
    master.connect(ac.destination);
    master.gain.setValueAtTime(0.22, t);
    master.gain.setValueAtTime(0.22, t + 1.7);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);

    // Bb3 → A3 → Ab3 → G3, the classic descent into disappointment.
    const NOTES = [
      [233.08, 0.0, 0.34],
      [220.0, 0.4, 0.34],
      [207.65, 0.8, 0.34],
      [196.0, 1.2, 1.0], // long, flat, and thoroughly miserable
    ];
    for (const [freq, at, len] of NOTES) {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(1, t + at + 0.05);
      g.gain.setValueAtTime(1, t + at + len - 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + len + 0.02);
      osc.frequency.setValueAtTime(freq, t + at);
      if (len > 0.5) {
        // The final note sags a further semitone and wobbles as it dies.
        osc.frequency.linearRampToValueAtTime(freq * 0.94, t + at + len);
        const lfo = ac.createOscillator();
        const lfoGain = ac.createGain();
        lfo.frequency.value = 5.5;
        lfoGain.gain.value = 5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(t + at);
        lfo.stop(t + at + len + 0.02);
      }
      osc.connect(g);
      g.connect(master);
      osc.start(t + at);
      osc.stop(t + at + len + 0.05);
    }
  } catch {
    // no audio available — England are spared, this once
  }
}
