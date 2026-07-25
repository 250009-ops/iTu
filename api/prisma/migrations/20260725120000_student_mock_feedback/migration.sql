-- Marketplace student feedback after mock completion (Telegram notify best-effort).

CREATE TABLE "student_mock_feedbacks" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "would_recommend" BOOLEAN,
    "skipped_at" TIMESTAMP(3),
    "telegram_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_mock_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_mock_feedbacks_enrollment_id_key" ON "student_mock_feedbacks"("enrollment_id");
CREATE INDEX "student_mock_feedbacks_student_id_idx" ON "student_mock_feedbacks"("student_id");

ALTER TABLE "student_mock_feedbacks"
  ADD CONSTRAINT "student_mock_feedbacks_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_mock_feedbacks"
  ADD CONSTRAINT "student_mock_feedbacks_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
