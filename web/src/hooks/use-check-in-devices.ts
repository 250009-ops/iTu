"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CheckInDeviceIcon } from "@/lib/exam/check-in-config";

export type DeviceVerdict = "idle" | "running" | "pass" | "fail";

type DeviceState = {
  verdict: DeviceVerdict;
  error: string | null;
  /** Headphones: waiting for user to confirm they heard the tone. */
  awaitingHeadphoneConfirm?: boolean;
  /** Camera preview while testing. */
  previewStream?: MediaStream | null;
};

function initialState(icons: CheckInDeviceIcon[]): Record<CheckInDeviceIcon, DeviceState> {
  const out = {} as Record<CheckInDeviceIcon, DeviceState>;
  for (const icon of icons) {
    out[icon] = { verdict: "idle", error: null, previewStream: null };
  }
  return out;
}

function playHeadphoneTestTone(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) {
        reject(new Error("Audio not supported on this device"));
        return;
      }
      const ctx = new Ctx();
      void ctx.resume().then(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440;
        gain.gain.value = 0.25;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        osc.onended = () => {
          void ctx.close();
          resolve();
        };
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Could not play test tone"));
    }
  });
}

export function useCheckInDevices(requiredIcons: CheckInDeviceIcon[]) {
  const iconsKey = requiredIcons.join(",");
  // Stabilize the icon list by value. The parent rebuilds this array on every
  // render (devices.map(...)), so depending on its identity caused the reset
  // effect below to fire on every render — wiping every device confirmation and
  // keeping the Start button permanently disabled.
  const icons = useMemo<CheckInDeviceIcon[]>(
    () => (iconsKey ? (iconsKey.split(",") as CheckInDeviceIcon[]) : []),
    [iconsKey],
  );
  const [states, setStates] = useState<Record<CheckInDeviceIcon, DeviceState>>(() =>
    initialState(icons),
  );
  const streamRef = useRef<MediaStream | null>(null);

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    setStates(initialState(icons));
    stopPreview();
  }, [icons, stopPreview]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  const setDevice = useCallback(
    (icon: CheckInDeviceIcon, patch: Partial<DeviceState>) => {
      setStates((prev) => ({
        ...prev,
        [icon]: { ...prev[icon]!, ...patch },
      }));
    },
    [],
  );

  const checkWifi = useCallback(async () => {
    setDevice("wifi", { verdict: "running", error: null });
    await new Promise((r) => setTimeout(r, 300));
    if (navigator.onLine) {
      setDevice("wifi", { verdict: "pass", error: null });
    } else {
      setDevice("wifi", {
        verdict: "fail",
        error: "You appear to be offline. Check your connection and retry.",
      });
    }
  }, [setDevice]);

  useEffect(() => {
    if (icons.includes("wifi")) {
      void checkWifi();
    }
  }, [icons, checkWifi]);

  const checkHeadphones = useCallback(async () => {
    setDevice("headphones", {
      verdict: "running",
      error: null,
      awaitingHeadphoneConfirm: false,
    });
    try {
      await playHeadphoneTestTone();
      setDevice("headphones", {
        verdict: "running",
        awaitingHeadphoneConfirm: true,
        error: null,
      });
    } catch (err) {
      setDevice("headphones", {
        verdict: "fail",
        awaitingHeadphoneConfirm: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not play test tone. Check volume and try again.",
      });
    }
  }, [setDevice]);

  const confirmHeadphones = useCallback(
    (heard: boolean) => {
      if (heard) {
        setDevice("headphones", {
          verdict: "pass",
          awaitingHeadphoneConfirm: false,
          error: null,
        });
      } else {
        setDevice("headphones", {
          verdict: "fail",
          awaitingHeadphoneConfirm: false,
          error: "Adjust your headphones or volume, then run the test again.",
        });
      }
    },
    [setDevice],
  );

  const checkMic = useCallback(async () => {
    setDevice("mic", { verdict: "running", error: null });
    stopPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ok = stream.getAudioTracks().some((t) => t.readyState === "live");
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setDevice("mic", {
        verdict: ok ? "pass" : "fail",
        error: ok ? null : "Microphone not detected.",
      });
    } catch (err) {
      setDevice("mic", {
        verdict: "fail",
        error:
          err instanceof Error
            ? err.message
            : "Microphone access denied or unavailable.",
      });
    }
  }, [setDevice, stopPreview]);

  const checkCamera = useCallback(async () => {
    setDevice("camera", { verdict: "running", error: null, previewStream: null });
    stopPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const ok = stream.getVideoTracks().some((t) => t.readyState === "live");
      if (!ok) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setDevice("camera", {
          verdict: "fail",
          error: "Webcam not detected.",
          previewStream: null,
        });
        return;
      }
      setDevice("camera", {
        verdict: "running",
        previewStream: stream,
        error: null,
      });
    } catch (err) {
      setDevice("camera", {
        verdict: "fail",
        error:
          err instanceof Error
            ? err.message
            : "Camera access denied or unavailable.",
        previewStream: null,
      });
    }
  }, [setDevice, stopPreview]);

  const confirmCamera = useCallback(() => {
    stopPreview();
    setDevice("camera", {
      verdict: "pass",
      previewStream: null,
      error: null,
    });
  }, [setDevice, stopPreview]);

  const confirmMonitor = useCallback(() => {
    setDevice("monitor", { verdict: "pass", error: null });
  }, [setDevice]);

  const runCheck = useCallback(
    (icon: CheckInDeviceIcon) => {
      switch (icon) {
        case "headphones":
          return checkHeadphones();
        case "mic":
          return checkMic();
        case "camera":
          return checkCamera();
        case "wifi":
          return checkWifi();
        case "monitor":
          confirmMonitor();
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    },
    [checkHeadphones, checkMic, checkCamera, checkWifi, confirmMonitor],
  );

  const allPassed = useMemo(
    () => icons.every((icon) => states[icon]?.verdict === "pass"),
    [icons, states],
  );

  return {
    states,
    allPassed,
    runCheck,
    confirmHeadphones,
    confirmCamera,
  };
}
