import type { UserRole } from "@/lib/auth/session";
import type { TeacherRegisterFormValues } from "@/lib/validations/teacher-register";
import { apiFetch } from "./client";
import { apiFetchForm } from "./form";

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  totpEnabled?: boolean;
  institution?: {
    id: string;
    name: string;
    status: string;
  };
  studentProfile?: {
    id: string;
    targetBand: number | null;
    examType: string;
    country: string | null;
    institutionStatus?: string | null;
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

export type TwoFactorChallenge = {
  requiresTwoFactor: true;
  user: { email: string; name: string };
};

export type LoginResponse = AuthResponse | TwoFactorChallenge;

export function isTwoFactorChallenge(
  response: LoginResponse,
): response is TwoFactorChallenge {
  return "requiresTwoFactor" in response && response.requiresTwoFactor === true;
}

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  targetBand: number;
  examType: "academic" | "general_training";
  acceptTerms: boolean;
};

export function login(email: string, password: string, totpCode?: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password, ...(totpCode ? { totpCode } : {}) },
    auth: false,
  });
}

export type RegisterResponse = {
  submitted: boolean;
  message: string;
  email: string;
};

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>("/auth/register", {
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

export type TeacherRegisterResponse = {
  submitted: boolean;
  message: string;
  email: string;
};

export function registerTeacher(
  data: TeacherRegisterFormValues,
  certificates: File[],
) {
  const form = new FormData();
  form.append("fullName", data.fullName);
  form.append("email", data.email);
  form.append("password", data.password);
  form.append("ieltsWritingBand", data.ieltsWritingBand);
  form.append("ieltsSpeakingBand", data.ieltsSpeakingBand);
  form.append("yearsExperience", data.yearsExperience);
  form.append("languages", JSON.stringify(data.languages));
  form.append("bio", data.bio);
  form.append("credentials", JSON.stringify(data.credentials));
  form.append("acceptTerms", String(data.acceptTerms));
  for (const file of certificates) {
    form.append("certificates", file);
  }

  return apiFetchForm<TeacherRegisterResponse>("/auth/register-teacher", form, {
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

export function verifyEmail(token: string) {
  return apiFetch<{ verified: boolean }>(
    `/auth/verify-email?token=${encodeURIComponent(token)}`,
    { method: "GET", auth: false },
  );
}

export function resendEmailVerification(email: string) {
  return apiFetch<{ sent: boolean; message?: string }>(
    "/auth/resend-email-verification",
    { method: "POST", body: { email }, auth: false },
  );
}

export type TotpSetupResponse = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
};

export function setupTwoFactor() {
  return apiFetch<TotpSetupResponse>("/auth/2fa/setup", { method: "POST" });
}

export function enableTwoFactor(code: string) {
  return apiFetch<{ enabled: boolean }>("/auth/2fa/enable", {
    method: "POST",
    body: { code },
  });
}

export function disableTwoFactor(password: string, code: string) {
  return apiFetch<{ disabled: boolean }>("/auth/2fa/disable", {
    method: "POST",
    body: { password, code },
  });
}
