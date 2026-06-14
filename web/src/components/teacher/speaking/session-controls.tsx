"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Clock,
  Pause,
  PhoneOff,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeakingRoom } from "@/contexts/speaking-room-context";
import { useTeacherSpeaking } from "@/contexts/teacher-speaking-context";
import {
  formatElapsed,
  type SpeakingPart,
} from "@/lib/speaking/scoring";
import { cn } from "@/lib/utils";

type PartDef = {
  part: SpeakingPart;
  title: string;
  durationLabel: string;
  targetSeconds: number;
  prompts: string[];
  cueCard?: { topic: string; bullets: string[] };
};

const PARTS: PartDef[] = [
  {
    part: 1,
    title: "Introduction & Interview",
    durationLabel: "4–5 minutes",
    targetSeconds: 5 * 60,
    prompts: [
      "Can you tell me your full name, please?",
      "Where are you from, and do you live in a house or a flat?",
      "Let's talk about your work or studies. What do you do?",
      "Do you enjoy your free time? What do you usually do?",
    ],
  },
  {
    part: 2,
    title: "Long Turn (Cue Card)",
    durationLabel: "3–4 minutes (1 min prep)",
    targetSeconds: 4 * 60,
    prompts: [
      "Give the candidate 1 minute to prepare.",
      "Ask them to speak for 1–2 minutes.",
      "Ask one or two rounding-off questions afterwards.",
    ],
    cueCard: {
      topic: "Describe a skill you would like to learn.",
      bullets: [
        "what the skill is",
        "how you would learn it",
        "how long it would take to learn",
        "and explain why you want to learn this skill.",
      ],
    },
  },
  {
    part: 3,
    title: "Two-way Discussion",
    durationLabel: "4–5 minutes",
    targetSeconds: 5 * 60,
    prompts: [
      "What skills do you think are most important for young people today?",
      "Do you think some skills are becoming less useful over time?",
      "How has technology changed the way people learn new skills?",
      "Should governments invest more in skills training? Why?",
    ],
  },
];

export function SessionControls() {
  const { sessionId } = useTeacherSpeaking();
  const { phase, setPhase, endSession } = useSpeakingRoom();
  const [activePart, setActivePart] = useState<SpeakingPart>(1);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = PARTS.find((p) => p.part === activePart) ?? PARTS[0];

  useEffect(() => {
    if (phase === "part1") setActivePart(1);
    if (phase === "part2-prep" || phase === "part2-speak") setActivePart(2);
    if (phase === "part3" || phase === "complete") setActivePart(3);
  }, [phase]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  async function selectPart(part: SpeakingPart) {
    setActivePart(part);
    setRunning(false);
    setElapsed(0);
    const nextPhase =
      part === 1 ? "part1" : part === 2 ? "part2-prep" : "part3";
    await setPhase(nextPhase);
  }

  async function advancePart2() {
    if (phase === "part2-prep") {
      await setPhase("part2-speak");
    }
  }

  async function startSession() {
    setRunning(true);
    await setPhase("part1");
  }

  const overTarget = elapsed > current.targetSeconds;

  if (!sessionId) return null;

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <h2 className="font-semibold text-navy">Session Controls</h2>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {PARTS.map((p) => (
          <button
            key={p.part}
            type="button"
            onClick={() => void selectPart(p.part)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
              activePart === p.part
                ? "border-navy bg-navy text-white"
                : "border-border bg-white text-muted hover:bg-slate-50",
            )}
          >
            Part {p.part}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-navy">{current.title}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3 w-3" />
          {current.durationLabel}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <span
          className={cn(
            "font-mono text-2xl font-bold tabular-nums",
            overTarget ? "text-rose-600" : "text-navy",
          )}
        >
          {formatElapsed(elapsed)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant={running ? "secondary" : "primary"}
            size="sm"
            onClick={() => {
              if (!running) void startSession();
              setRunning((r) => !r);
            }}
          >
            {running ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                {elapsed === 0 ? "Start" : "Resume"}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRunning(false);
              setElapsed(0);
            }}
            aria-label="Reset timer"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activePart === 2 && phase === "part2-prep" && (
        <Button
          className="mt-3 w-full"
          size="sm"
          onClick={() => void advancePart2()}
        >
          Start Part 2 speaking
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {current.cueCard && activePart === 2 && (
        <div className="mt-3 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">
            {current.cueCard.topic}
          </p>
          <p className="mt-1 text-xs font-medium text-amber-800">
            You should say:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-800">
            {current.cueCard.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Examiner prompts
        </p>
        <ul className="mt-2 space-y-1.5">
          {current.prompts.map((prompt) => (
            <li
              key={prompt}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-foreground"
            >
              {prompt}
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="mt-4 w-full text-rose-700"
        onClick={() => void endSession()}
      >
        <PhoneOff className="h-4 w-4" />
        End live session
      </Button>
    </div>
  );
}
