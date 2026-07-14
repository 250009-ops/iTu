"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";

type LenisInstance = Lenis | null;
const LenisContext = createContext<LenisInstance>(null);

export function useLenis() {
  return useContext(LenisContext);
}

// Interpolated scroll engine. Forwards scroll events so header state and
// Framer Motion whileInView stay aligned with the virtual scroll position.
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<LenisInstance>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const instance = new Lenis({
      duration: 1,
      lerp: 0.12,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
    });

    setLenis(instance);

    instance.on("scroll", () => {
      window.dispatchEvent(new Event("scroll"));
    });

    let frame = 0;
    function raf(time: number) {
      instance.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
