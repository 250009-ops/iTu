import { apiFetch } from "./client";

export function listTeachers(speciality?: "writing" | "speaking" | "both") {
  const q = speciality ? `?speciality=${speciality}` : "";
  return apiFetch<
    {
      id: string;
      name: string;
      email: string;
      speciality: string;
      rating: number | null;
      status: string;
      writingRate: number;
      speakingRate: number;
    }[]
  >(`/bookings/teachers${q}`, { auth: false });
}

export function quoteBooking(body: {
  packageId: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
}) {
  return apiFetch<{
    packageId: string;
    amount: number;
    currency: string;
    complete: boolean;
    examinerPriced: boolean;
    missing: Array<"writing" | "speaking">;
    breakdown: {
      listening: number;
      reading: number;
      writing: number;
      speaking: number;
    };
    message: string | null;
  }>("/bookings/quote", { method: "POST", body, auth: false });
}

export function getAvailability(date: string, teacherId?: string) {
  const params = new URLSearchParams({ date });
  if (teacherId) params.set("teacherId", teacherId);
  return apiFetch<
    {
      id: string;
      teacherId: string;
      teacherName: string;
      startsAt: string;
      endsAt: string;
      status: string;
    }[]
  >(`/bookings/availability?${params}`, { auth: false });
}

export type CreateBookingBody = {
  packageId: string;
  mockDate: string;
  mockTime: string;
  writingTeacherId?: string;
  speakingTeacherId?: string;
  speakingSlotId?: string;
  paymentMethod?: string;
};

export type CreateBookingResult = {
  enrollmentId: string;
  enrollmentCode: string;
  orderId: string;
  orderCode: string;
  sessionCode: string | null;
  amount: number;
  currency: string;
  status: string;
  checkoutUrl?: string | null;
  checkoutExpiresAt?: string | null;
};

export function getContentAvailability(packageId: string) {
  return apiFetch<{
    packageId: string;
    canPurchase: boolean;
    blockingReason: string | null;
    message: string;
    perSkill: {
      skill: string;
      testId: string | null;
      testCode: string | null;
      alreadyTaken: boolean;
      canPurchase: boolean;
    }[];
  }>(`/bookings/packages/${encodeURIComponent(packageId)}/content-availability`);
}

export function createBooking(body: CreateBookingBody) {
  return apiFetch<CreateBookingResult>("/bookings", {
    method: "POST",
    body,
  });
}

export function rescheduleBooking(
  enrollmentId: string,
  body: { mockDate: string; mockTime: string; speakingSlotId?: string },
) {
  return apiFetch<{
    enrollmentId: string;
    enrollmentCode: string;
    mockDate: string;
    mockTime: string;
    status: string;
  }>(`/bookings/${enrollmentId}/reschedule`, { method: "PATCH", body });
}

export function scheduleSpeakingSlot(
  enrollmentId: string,
  body: { speakingSlotId: string },
) {
  return apiFetch<{ enrollmentId: string; scheduledAt: string; status: string }>(
    `/bookings/${enrollmentId}/speaking-slot`,
    { method: "PATCH", body },
  );
}
