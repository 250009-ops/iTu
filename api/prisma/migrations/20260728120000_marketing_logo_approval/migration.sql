-- Marketing-site logo approval (Trusted by Edu Centers strip).
-- Centre portal may still show logo_url immediately; marketing uses APPROVED only.

CREATE TYPE "MarketingLogoStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "institutions"
  ADD COLUMN IF NOT EXISTS "marketing_logo_status" "MarketingLogoStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "marketing_logo_reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "marketing_logo_review_note" TEXT;

-- Grandfather existing live logos so the marketing strip does not blank on deploy.
UPDATE "institutions"
SET "marketing_logo_status" = 'APPROVED',
    "marketing_logo_reviewed_at" = COALESCE("marketing_logo_reviewed_at", NOW())
WHERE "logo_url" IS NOT NULL
  AND "logo_url" <> ''
  AND "marketing_logo_status" = 'NONE';
