-- Student-to-student referral: invite code + 2-invite Reading/Listening reward.

ALTER TABLE "student_profiles"
  ADD COLUMN "referral_code" TEXT,
  ADD COLUMN "referred_by_id" TEXT,
  ADD COLUMN "referral_reward_claimed_at" TIMESTAMP(3),
  ADD COLUMN "referral_reward_skill" TEXT;

CREATE UNIQUE INDEX "student_profiles_referral_code_key" ON "student_profiles"("referral_code");
CREATE INDEX "student_profiles_referred_by_id_idx" ON "student_profiles"("referred_by_id");

ALTER TABLE "student_profiles"
  ADD CONSTRAINT "student_profiles_referred_by_id_fkey"
  FOREIGN KEY ("referred_by_id") REFERENCES "student_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enrollments"
  ADD COLUMN "referral_reward_granted" BOOLEAN NOT NULL DEFAULT false;
