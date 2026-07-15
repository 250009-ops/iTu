import { z } from "zod";

export const TEACHER_BAND_OPTIONS = ["7.5", "8.0", "8.5", "9.0"] as const;

export const TEACHER_LANGUAGE_OPTIONS = ["Uzbek", "English", "Russian"] as const;

export const TEACHER_CREDENTIAL_OPTIONS = [
  "CELTA",
  "DELTA",
  "IELTS Examiner Certification",
  "TESOL",
  "MA Applied Linguistics",
  "Certified Examiner",
] as const;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

/** Base fields — kept as a plain object schema so step validators can reuse shapes safely. */
const teacherRegisterBaseSchema = z.object({
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
  bio: z
    .string()
    .min(1, "Professional bio is required")
    .min(80, "Bio must be at least 80 characters — this appears on your public examiner profile")
    .max(500, "Bio must be 500 characters or fewer"),
  credentials: z
    .array(z.enum(TEACHER_CREDENTIAL_OPTIONS))
    .min(1, "Select at least one qualification"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms to continue",
  }),
});

export const teacherRegisterSchema = teacherRegisterBaseSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  },
);

export type TeacherRegisterFormValues = z.infer<typeof teacherRegisterBaseSchema>;

export const teacherRegisterSteps = [
  { id: 1, label: "Account" },
  { id: 2, label: "IELTS & experience" },
  { id: 3, label: "Credentials" },
  { id: 4, label: "Review" },
] as const;

const step1Schema = teacherRegisterBaseSchema
  .pick({
    fullName: true,
    email: true,
    password: true,
    confirmPassword: true,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const step2Schema = teacherRegisterBaseSchema.pick({
  ieltsWritingBand: true,
  ieltsSpeakingBand: true,
  yearsExperience: true,
  languages: true,
  bio: true,
  credentials: true,
});

export function isTeacherRegisterStepReady(
  step: number,
  values: TeacherRegisterFormValues,
  certificateCount: number,
): boolean {
  if (step === 1) return step1Schema.safeParse(values).success;
  if (step === 2) return step2Schema.safeParse(values).success;
  if (step === 3) return certificateCount > 0 && values.acceptTerms === true;
  return true;
}
