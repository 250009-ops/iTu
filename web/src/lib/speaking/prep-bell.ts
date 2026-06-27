/** Short ring tone when Part 2 preparation time ends (both sides). */
export function playPrepEndBell() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    void ctx.resume().then(() => {
      const now = ctx.currentTime;
      const pattern = [
        { freq: 880, start: 0, dur: 0.18 },
        { freq: 660, start: 0.22, dur: 0.18 },
        { freq: 880, start: 0.44, dur: 0.28 },
      ];

      for (const { freq, start, dur } of pattern) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      }

      window.setTimeout(() => void ctx.close(), 1200);
    });
  } catch {
    // ignore — visual cues still show
  }
}
