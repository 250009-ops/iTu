/** Unlock audio playback from a user gesture (check-in Begin, instruction Next, etc.). */
export function primeAudioPlayback() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    void ctx.resume().then(() => {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      void ctx.close();
    });
  } catch {
    // Browsers without Web Audio — listening uses HTMLAudioElement instead.
  }
}
