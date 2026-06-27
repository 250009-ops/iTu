"use client";

import { useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Headphones,
  Loader2,
  Mic,
  Monitor,
  Wifi,
  Camera,
} from "lucide-react";
import type { CheckInDevice, CheckInDeviceIcon } from "@/lib/exam/check-in-config";
import { useCheckInDevices } from "@/hooks/use-check-in-devices";
import { cn } from "@/lib/utils";

const DEVICE_ICONS: Record<
  CheckInDeviceIcon,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  headphones: Headphones,
  mic: Mic,
  camera: Camera,
  wifi: Wifi,
  monitor: Monitor,
};

type Props = {
  devices: CheckInDevice[];
  onAllPassedChange: (passed: boolean) => void;
};

export function CheckInDevicePanel({ devices, onAllPassedChange }: Props) {
  const icons = devices.map((d) => d.icon);
  const { states, allPassed, runCheck, confirmHeadphones, confirmCamera } =
    useCheckInDevices(icons);

  useEffect(() => {
    onAllPassedChange(allPassed);
  }, [allPassed, onAllPassedChange]);

  const gridClass =
    devices.length <= 2
      ? "sm:grid-cols-2"
      : devices.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-3", gridClass)}>
      {devices.map((device) => {
        const Icon = DEVICE_ICONS[device.icon];
        const state = states[device.icon];
        const passed = state?.verdict === "pass";
        const failed = state?.verdict === "fail";
        const running = state?.verdict === "running";

        return (
          <div
            key={device.label}
            className={cn(
              "rounded-xl border bg-white px-3 py-3 text-[13px]",
              passed
                ? "border-emerald-200"
                : failed
                  ? "border-red-200"
                  : "border-slate-200",
            )}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-slate-400">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{device.label}</p>
                {state?.error && (
                  <p className="mt-1 flex items-start gap-1 text-[12px] text-red-600">
                    <AlertCircle size={13} className="mt-0.5 shrink-0" />
                    {state.error}
                  </p>
                )}
                {device.icon === "camera" && state?.previewStream && (
                  <video
                    autoPlay
                    muted
                    playsInline
                    ref={(el) => {
                      if (el && state.previewStream) {
                        el.srcObject = state.previewStream;
                      }
                    }}
                    className="mt-2 aspect-video w-full rounded-lg bg-slate-900 object-cover"
                  />
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {passed ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                      <CheckCircle2 size={14} /> Verified
                    </span>
                  ) : state?.awaitingHeadphoneConfirm ? (
                    <>
                      <button
                        type="button"
                        onClick={() => confirmHeadphones(true)}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-emerald-700"
                      >
                        I heard it
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmHeadphones(false)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        No sound
                      </button>
                    </>
                  ) : state?.previewStream && device.icon === "camera" ? (
                    <button
                      type="button"
                      onClick={confirmCamera}
                      className="rounded-md bg-navy px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-navy/90"
                    >
                      Looks good
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => void runCheck(device.icon)}
                      className="inline-flex items-center gap-1 rounded-md border border-navy px-2.5 py-1 text-[12px] font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-60"
                    >
                      {running && <Loader2 size={12} className="animate-spin" />}
                      {device.icon === "headphones"
                        ? "Play test tone"
                        : device.icon === "mic"
                          ? "Test microphone"
                          : device.icon === "camera"
                            ? "Test webcam"
                            : device.icon === "wifi"
                              ? "Retry connection"
                              : "Confirm ready"}
                    </button>
                  )}
                </div>
              </div>
              {passed && (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
