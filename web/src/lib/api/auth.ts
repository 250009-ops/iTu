import type { UserRole } from "@/lib/auth/session";
import { apiFetch } from "./client";

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studentProfile?: {
    id: string;
    targetBand: number | null;
    examType: string;
    country: string | null;
  };
  teacherProfile?: {
    id: string;
    status: string;
    speciality: string;
    rating: number | null;
  };
};

export type AuthResponse = {
  accessToken: string;
  user: ApiUser;
  dashboardPath: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  targetBand: number;
  examType: "academic" | "general_training";
  acceptTerms: boolean;
};

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function register(payload: RegisterPayload) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: {
      ...payload,
      examType:
        payload.examType === "general_training"
          ? "GENERAL_TRAINING"
          : "ACADEMIC",
    },
    auth: false,
  });
}

export function getMe(token?: string) {
  return apiFetch<ApiUser>("/auth/me", { token });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ updated: boolean }>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export function forgotPassword(email: string) {
  return apiFetch<{ sent: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch<{ updated: boolean }>("/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
    auth: false,
  });
}
