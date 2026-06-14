"use client";



import { useEffect, useRef, useState } from "react";



/**

 * Display-only countdown. In production the server is the source of truth;

 * this mirrors that contract by counting down from a fixed start and firing

 * `onExpire` once when it reaches zero.

 */

export function useCountdown(initialSeconds: number, onExpire?: () => void) {

  const [remaining, setRemaining] = useState(initialSeconds);

  const firedRef = useRef(false);

  const expireRef = useRef(onExpire);

  expireRef.current = onExpire;



  useEffect(() => {

    setRemaining(initialSeconds);

    firedRef.current = false;

  }, [initialSeconds]);



  useEffect(() => {

    const id = window.setInterval(() => {

      setRemaining((prev) => {

        if (prev <= 1) {

          window.clearInterval(id);

          return 0;

        }

        return prev - 1;

      });

    }, 1000);

    return () => window.clearInterval(id);

  }, [initialSeconds]);



  useEffect(() => {

    if (remaining > 0 || firedRef.current) return;

    firedRef.current = true;

    expireRef.current?.();

  }, [remaining]);



  return remaining;

}



/** Simple elapsed-time counter that ticks up every second. */

export function useStopwatch(running = true) {

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {

    if (!running) return;

    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => window.clearInterval(id);

  }, [running]);

  return elapsed;

}


