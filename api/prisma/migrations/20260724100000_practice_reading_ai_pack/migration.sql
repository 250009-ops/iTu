-- CreateEnum
CREATE TYPE "PracticeAiPackStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "PracticeGlossLanguage" AS ENUM ('EN', 'UZ', 'RU');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN "gloss_language" "PracticeGlossLanguage" NOT NULL DEFAULT 'EN';

-- AlterTable
ALTER TABLE "practice_attempts" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'practice';

-- CreateTable
CREATE TABLE "practice_unit_ai_packs" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "status" "PracticeAiPackStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "generated_at" TIMESTAMP(3),
    "error_message" TEXT,
    "section_status" JSONB NOT NULL DEFAULT '{}',
    "question_insights" JSONB,
    "glossary" JSONB,
    "vocab_pack" JSONB,
    "paraphrase_drills" JSONB,
    "skim_scan_tasks" JSONB,
    "strategy_playbook" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_unit_ai_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_tutor_messages" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_chip_id" TEXT,
    "question_n" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_tutor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practice_unit_ai_packs_unit_id_key" ON "practice_unit_ai_packs"("unit_id");

-- CreateIndex
CREATE INDEX "practice_tutor_messages_attempt_id_idx" ON "practice_tutor_messages"("attempt_id");

-- AddForeignKey
ALTER TABLE "practice_unit_ai_packs" ADD CONSTRAINT "practice_unit_ai_packs_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "practice_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_tutor_messages" ADD CONSTRAINT "practice_tutor_messages_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "practice_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
