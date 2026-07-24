-- Track referral invites sent by email (signup link attribution).

CREATE TABLE "student_referral_invites" (
    "id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "invitee_id" TEXT,

    CONSTRAINT "student_referral_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_referral_invites_invitee_id_key" ON "student_referral_invites"("invitee_id");
CREATE UNIQUE INDEX "student_referral_invites_inviter_id_email_key" ON "student_referral_invites"("inviter_id", "email");
CREATE INDEX "student_referral_invites_email_idx" ON "student_referral_invites"("email");

ALTER TABLE "student_referral_invites"
  ADD CONSTRAINT "student_referral_invites_inviter_id_fkey"
  FOREIGN KEY ("inviter_id") REFERENCES "student_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_referral_invites"
  ADD CONSTRAINT "student_referral_invites_invitee_id_fkey"
  FOREIGN KEY ("invitee_id") REFERENCES "student_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
