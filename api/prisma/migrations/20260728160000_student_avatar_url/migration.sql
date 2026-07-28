-- Allow marketplace and centre students to store a profile photo (data URL / URL).
ALTER TABLE "student_profiles"
  ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
