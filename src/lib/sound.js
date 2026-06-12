/**
 * Synthesised air horn for goal celebrations — three detuned oscillators
 * through a shared envelope, no audio asset needed. Browsers block audio
 * until the user has interacted with the page; failures are swallowed.
 */
let ctx = null;

export function airHorn() {
  try {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
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
      const osc = ctx.createOscillator();
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
