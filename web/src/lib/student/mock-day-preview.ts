/** Static preview content for Mock Day Hub when no session is booked. */
export const mockDayPreviewSections = [
  {
    id: "listening",
    name: "Listening",
    detail: "40 questions · 40 min · Auto scored",
    color: "#2563EB",
  },
  {
    id: "reading",
    name: "Reading",
    detail: "40 questions · 60 min · Auto scored",
    color: "#059669",
  },
  {
    id: "writing",
    name: "Writing",
    detail: "2 tasks · 60 min · Human graded",
    color: "#7C3AED",
  },
  {
    id: "speaking",
    name: "Speaking",
    detail: "3 parts · 11–14 min · Live examiner",
    color: "#DC2626",
  },
] as const;

export const mockDayPreviewSchedule = [
  {
    id: "checkin",
    title: "Check-in",
    detail: "Identity & environment check",
    time: "09:00",
  },
  {
    id: "listening",
    title: "Listening",
    detail: "40 min · Computer delivered",
    time: "09:15",
  },
  {
    id: "break-1",
    title: "Break",
    detail: "10 min",
    time: "",
    isBreak: true,
  },
  {
    id: "reading",
    title: "Reading",
    detail: "60 min · Computer delivered",
    time: "09:55",
  },
  {
    id: "break-2",
    title: "Break",
    detail: "10 min",
    time: "",
    isBreak: true,
  },
  {
    id: "writing",
    title: "Writing",
    detail: "60 min · Task 1 & 2",
    time: "11:05",
  },
  {
    id: "speaking",
    title: "Speaking",
    detail: "Live session with your examiner",
    time: "14:00",
  },
] as const;

export const mockDayPreparationChecklist = [
  "Stable internet connection",
  "Working microphone & webcam",
  "Quiet, well-lit room",
  "Valid photo ID ready for check-in",
  "Browser fullscreen enabled",
] as const;
