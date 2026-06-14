import { z } from "zod";

const DEMO_USERNAMES = ["student", "teacher", "admin"] as const;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .refine(
      (val) =>
        DEMO_USERNAMES.includes(
          val.trim().toLowerCase() as (typeof DEMO_USERNAMES)[number],
        ) || z.string().email().safeParse(val).success,
      { message: "Enter a valid email or demo username" },
    ),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Name must be at least 2 characters"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    targetBand: z.string().min(1, "Select your target band score"),
    examType: z.enum(["academic", "general_training"]),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms to continue",
    }),
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const BAND_OPTIONS = [
  "5.0",
  "5.5",
  "6.0",
  "6.5",
  "7.0",
  "7.5",
  "8.0",
  "8.5",
  "9.0",
] as const;
