import { apiFetch } from "./client";

export function getTeacherDashboard() {
  return apiFetch<{
    stats: {
      sessionsToday: number;
      writingQueue: number;
      speakingQueue: number;
      rating: number | null;
      totalEarned: number;
    };
    speakingSchedule: {
      id: string;
      studentName: string;
      scheduledAt: string | null;
      status: string;
    }[];
  }>("/teachers/dashboard");
}

export function getTeacherSpeakingSessions() {
  return apiFetch<{
    today: SpeakingSessionListItem[];
    upcoming: SpeakingSessionListItem[];
    completed: SpeakingSessionListItem[];
    counts: { today: number; upcoming: number; completed: number };
    nextSession: SpeakingSessionListItem | null;
    minutesUntilNext: number | null;
  }>("/teachers/speaking-sessions");
}

export type SpeakingSessionListItem = {
  id: string;
  enrollmentId?: string;
  enrollmentCode?: string;
  sessionCode?: string;
  studentName: string;
  scheduledAt: string | null;
  endsAt: string | null;
  status: string;
  uiStatus: "upcoming" | "live" | "awaiting_grade" | "graded" | "no_show";
  examType: string;
  packageTitle: string;
  grade: {
    overallBand: number;
    criteriaScores: Record<string, number>;
  } | null;
  recordingUrl: string | null;
};

export function getTeacherAvailability(weekStart?: string) {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  return apiFetch<{
    slotDuration: number;
    bufferMinutes: number;
    weekStart: string;
    weekly: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDuration: number;
    }[];
    slots: {
      id: string;
      startsAt: string;
      endsAt: string;
      status: string;
      studentName: string | null;
    }[];
    upcoming: {
      id: string;
      startsAt: string;
      endsAt: string;
      studentName: string;
      speakingSessionId: string | null;
    }[];
  }>(`/teachers/availability${query}`);
}

export function updateTeacherAvailability(
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  slotDuration?: number,
) {
  return apiFetch<{ updated: number; slotsGenerated?: number }>(
    "/teachers/availability",
    {
      method: "PUT",
      body: { slots, slotDuration },
    },
  );
}

export function blockTeacherSlot(slotId: string) {
  return apiFetch<{ blocked: boolean }>(`/teachers/slots/${slotId}/block`, {
    method: "PATCH",
  });
}

export function unblockTeacherSlot(slotId: string) {
  return apiFetch<{ unblocked: boolean }>(`/teachers/slots/${slotId}/unblock`, {
    method: "PATCH",
  });
}

export function getTeacherEarnings() {
  return apiFetch<{
    totalEarned: number;
    totalSessions: number;
    speakingRate: number;
    writingRate: number;
    speakingGross?: number;
    writingGross?: number;
    platformSharePercent?: number;
    pendingBalance: number;
    payoutSchedule: string;
    payoutDetails: {
      bankName?: string;
      accountName?: string;
      accountLast4?: string;
      method?: string;
    } | null;
    weeklyRevenue: {
      days: { day: string; speaking: number; writing: number }[];
      hasData: boolean;
    };
    payouts: {
      id: string;
      amount: number;
      currency: string;
      status: string;
      periodStart: string;
      periodEnd: string;
      paidAt: string | null;
    }[];
  }>("/teachers/earnings");
}

export function requestTeacherPayout() {
  return apiFetch<{ requested: number; amount: number }>(
    "/teachers/payouts/request",
    { method: "POST" },
  );
}

export type TeacherProfileResponse = {
  name: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  notificationPrefs: Record<string, boolean> | null;
  credentials: unknown;
  languages: string[];
  speciality: string;
  rating: number | null;
  reviewCount: number;
  totalSessions: number;
  totalEarned: number;
  status: string;
  memberSince: string;
  emailVerified: boolean;
  sessionActivityMonths: { month: string; count: number }[];
};

export function getTeacherProfile() {
  return apiFetch<TeacherProfileResponse>("/teachers/profile");
}

export type UpdateTeacherProfileBody = {
  name?: string;
  bio?: string;
  speciality?: "writing" | "speaking" | "both";
  avatarUrl?: string;
  notificationPrefs?: Record<string, boolean>;
  payoutDetails?: {
    bankName?: string;
    accountName?: string;
    accountLast4?: string;
    method?: string;
  };
};

export function updateTeacherProfile(body: UpdateTeacherProfileBody) {
  return apiFetch<TeacherProfileResponse>("/teachers/profile", {
    method: "PATCH",
    body,
  });
}
