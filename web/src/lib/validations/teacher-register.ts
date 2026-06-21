import { z } from "zod";

export const TEACHER_BAND_OPTIONS = ["7.5", "8.0", "8.5", "9.0"] as const;

export const TEACHER_LANGUAGE_OPTIONS = ["Uzbek", "English", "Russian"] as const;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

export const teacherRegisterSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Name must be at least 2 characters"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    ieltsWritingBand: z.enum(TEACHER_BAND_OPTIONS, {
      message: "Select your IELTS Writing band",
    }),
    ieltsSpeakingBand: z.enum(TEACHER_BAND_OPTIONS, {
      message: "Select your IELTS Speaking band",
    }),
    yearsExperience: z
      .string()
      .min(1, "Enter years of experience")
      .refine((v) => {
        const n = parseInt(v, 10);
        return !Number.isNaN(n) && n >= 1 && n <= 50;
      }, "Enter a value between 1 and 50"),
    languages: z
      .array(z.enum(TEACHER_LANGUAGE_OPTIONS))
      .min(1, "Select at least one language"),
    phone: z.string().max(30).optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type TeacherRegisterFormValues = z.infer<typeof teacherRegisterSchema>;

export const teacherRegisterSteps = [
  { id: 1, label: "Account" },
  { id: 2, label: "IELTS & experience" },
  { id: 3, label: "Credentials" },
  { id: 4, label: "Review" },
] as const;
