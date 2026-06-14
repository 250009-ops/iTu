"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeviceCheckState = {
  micOk: boolean;
  cameraOk: boolean;
  micLevel: number;
  checking: boolean;
  error: string | null;
  previewStream: MediaStream | null;
};

export function useDeviceCheck() {
  const [state, setState] = useState<DeviceCheckState>({
    micOk: false,
    cameraOk: false,
    micLevel: 0,
    checking: true,
    error: null,
    previewStream: null,
  });
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
  }, []);

  const runCheck = useCallback(async () => {
    stopStream();
    setState((s) => ({ ...s, checking: true, error: null, previewStream: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastLevelUpdate = 0;
      const tick = (now: number) => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        if (now - lastLevelUpdate >= 100) {
          lastLevelUpdate = now;
          setState((s) => ({ ...s, micLevel: level }));
        }
        animationRef.current = requestAnimationFrame(tick);
      };
      animationRef.current = requestAnimationFrame(tick);

      setState({
        micOk: stream.getAudioTracks().some((t) => t.enabled),
        cameraOk: stream.getVideoTracks().some((t) => t.enabled),
        micLevel: 0,
        checking: false,
        error: null,
        previewStream: stream,
      });
    } catch (err) {
      setState({
        micOk: false,
        cameraOk: false,
        micLevel: 0,
        checking: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not access microphone or camera",
        previewStream: null,
      });
    }
  }, [stopStream]);

  useEffect(() => {
    void runCheck();
    return stopStream;
  }, [runCheck, stopStream]);

  return { ...state, runCheck };
}
