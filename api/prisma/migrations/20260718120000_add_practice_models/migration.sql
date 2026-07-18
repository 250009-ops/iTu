-- Practice Tests, Credit Bundles & AI Writing
-- Run: npx prisma migrate deploy

-- CreateEnum
CREATE TYPE "PracticeUnitType" AS ENUM ('READING_PASSAGE', 'READING_QUESTION_TYPE', 'LISTENING_SECTION', 'LISTENING_QUESTION_TYPE');
CREATE TYPE "PracticeCreditType" AS ENUM ('READING_PASSAGE', 'READING_QUESTION_TYPE', 'LISTENING_SECTION', 'LISTENING_QUESTION_TYPE', 'AI_WRITING_ESSAY');
CREATE TYPE "PracticeCreditTxnType" AS ENUM ('PURCHASE', 'CONSUME', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "PracticeAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
CREATE TYPE "WritingPracticeSessionStatus" AS ENUM ('DRAFT', 'ANALYZING', 'READY', 'FAILED');

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'PRACTICE_BUNDLE';

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN "practice_unit_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "practice_package_id" TEXT;

-- CreateTable
CREATE TABLE "practice_units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PracticeUnitType" NOT NULL,
    "skill" "ExamSkill" NOT NULL,
    "question_type" TEXT,
    "content" JSONB NOT NULL,
    "answer_key" JSONB,
    "duration_min" INTEGER NOT NULL DEFAULT 20,
    "question_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentTestStatus" NOT NULL DEFAULT 'DRAFT',
    "source_content_test_id" TEXT,
    "source_passage_index" INTEGER,
    "source_part_index" INTEGER,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "writing_practice_prompts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "task_number" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "min_words" INTEGER NOT NULL DEFAULT 150,
    "image_asset_key" TEXT,
    "image_url" TEXT,
    "status" "ContentTestStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "writing_practice_prompts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_product_packages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "bundle" JSONB NOT NULL,
    "display_prices" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "most_popular" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_product_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_practice_wallets" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "reading_passages" INTEGER NOT NULL DEFAULT 0,
    "reading_question_types" INTEGER NOT NULL DEFAULT 0,
    "listening_sections" INTEGER NOT NULL DEFAULT 0,
    "listening_question_types" INTEGER NOT NULL DEFAULT 0,
    "ai_writing_essays" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_practice_wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_credit_txns" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "PracticeCreditTxnType" NOT NULL,
    "credit_type" "PracticeCreditType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "order_id" TEXT,
    "attempt_id" TEXT,
    "session_id" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_credit_txns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "practice_attempts" (
    "id" TEXT NOT NULL,
    "attempt_code" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "status" "PracticeAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "writing_practice_sessions" (
    "id" TEXT NOT NULL,
    "session_code" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "task_number" INTEGER NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '{}',
    "ai_feedback" JSONB,
    "status" "WritingPracticeSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "credit_consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "writing_practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practice_units_code_key" ON "practice_units"("code");
CREATE INDEX "practice_units_type_status_idx" ON "practice_units"("type", "status");
CREATE INDEX "practice_units_skill_question_type_idx" ON "practice_units"("skill", "question_type");
CREATE UNIQUE INDEX "writing_practice_prompts_code_key" ON "writing_practice_prompts"("code");
CREATE UNIQUE INDEX "practice_product_packages_slug_key" ON "practice_product_packages"("slug");
CREATE UNIQUE INDEX "student_practice_wallets_student_id_key" ON "student_practice_wallets"("student_id");
CREATE INDEX "practice_credit_txns_student_id_idx" ON "practice_credit_txns"("student_id");
CREATE UNIQUE INDEX "practice_attempts_attempt_code_key" ON "practice_attempts"("attempt_code");
CREATE INDEX "practice_attempts_student_id_idx" ON "practice_attempts"("student_id");
CREATE UNIQUE INDEX "writing_practice_sessions_session_code_key" ON "writing_practice_sessions"("session_code");
CREATE INDEX "writing_practice_sessions_student_id_idx" ON "writing_practice_sessions"("student_id");
CREATE UNIQUE INDEX "media_assets_practice_unit_id_key_key" ON "media_assets"("practice_unit_id", "key");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_practice_unit_id_fkey" FOREIGN KEY ("practice_unit_id") REFERENCES "practice_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_practice_package_id_fkey" FOREIGN KEY ("practice_package_id") REFERENCES "practice_product_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "practice_units" ADD CONSTRAINT "practice_units_source_content_test_id_fkey" FOREIGN KEY ("source_content_test_id") REFERENCES "content_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_practice_wallets" ADD CONSTRAINT "student_practice_wallets_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_credit_txns" ADD CONSTRAINT "practice_credit_txns_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "practice_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "writing_practice_sessions" ADD CONSTRAINT "writing_practice_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "writing_practice_sessions" ADD CONSTRAINT "writing_practice_sessions_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "writing_practice_prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
