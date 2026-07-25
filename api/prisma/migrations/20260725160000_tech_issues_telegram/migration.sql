-- Admin tech-issues Telegram bot tables
CREATE TYPE "TechIssueStatus" AS ENUM ('PENDING', 'RESOLVED', 'CANT');

CREATE TABLE IF NOT EXISTS "telegram_admin_sessions" (
    "id" TEXT NOT NULL,
    "telegram_chat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_admin_sessions_telegram_chat_id_key"
  ON "telegram_admin_sessions"("telegram_chat_id");
CREATE INDEX IF NOT EXISTS "telegram_admin_sessions_user_id_idx"
  ON "telegram_admin_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "telegram_admin_sessions_expires_at_idx"
  ON "telegram_admin_sessions"("expires_at");

ALTER TABLE "telegram_admin_sessions"
  ADD CONSTRAINT "telegram_admin_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "tech_issues" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reporter_user_id" TEXT NOT NULL,
    "telegram_chat_id" TEXT NOT NULL,
    "status" "TechIssueStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "cant_reason" TEXT,
    "channel_message_id" TEXT,
    "photo_file_ids" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tech_issues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tech_issues_code_key" ON "tech_issues"("code");
CREATE INDEX IF NOT EXISTS "tech_issues_reporter_user_id_idx" ON "tech_issues"("reporter_user_id");
CREATE INDEX IF NOT EXISTS "tech_issues_status_idx" ON "tech_issues"("status");

ALTER TABLE "tech_issues"
  ADD CONSTRAINT "tech_issues_reporter_user_id_fkey"
  FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
