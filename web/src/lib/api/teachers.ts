import { apiFetch } from "./client";

export function getTeacherDashboard() {
  return apiFetch<{
    stats: {
      sessionsToday: number;
      writingQueue: number;
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

export function getTeacherAvailability() {
  return apiFetch<{
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
    }[];
  }>("/teachers/availability");
}

export function updateTeacherAvailability(
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
) {
  return apiFetch<{ updated: number }>("/teachers/availability", {
    method: "PUT",
    body: { slots },
  });
}

export function blockTeacherSlot(slotId: string) {
  return apiFetch<{ blocked: boolean }>(`/teachers/slots/${slotId}/block`, {
    method: "PATCH",
  });
}

export function getTeacherEarnings() {
  return apiFetch<{
    totalEarned: number;
    commissionRate: number;
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
  speciality: string;
  rating: number | null;
  totalSessions: number;
  totalEarned: number;
  status: string;
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
};

export function updateTeacherProfile(body: UpdateTeacherProfileBody) {
  return apiFetch<TeacherProfileResponse>("/teachers/profile", {
    method: "PATCH",
    body,
  });
}
