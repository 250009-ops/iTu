-- CreateEnum
CREATE TYPE "InstitutionMockSetGrantSource" AS ENUM ('ADMIN_GRANT', 'PURCHASE');

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'INSTITUTION_MOCK_SET';

-- AlterTable
ALTER TABLE "institution_mock_sets" ADD COLUMN "list_price" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "institution_mock_sets" ADD COLUMN "is_listed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "institution_mock_set_grants" ADD COLUMN "source" "InstitutionMockSetGrantSource" NOT NULL DEFAULT 'ADMIN_GRANT';
ALTER TABLE "institution_mock_set_grants" ADD COLUMN "order_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "institution_mock_set_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "institution_mock_set_grants_order_id_key" ON "institution_mock_set_grants"("order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_institution_mock_set_id_fkey" FOREIGN KEY ("institution_mock_set_id") REFERENCES "institution_mock_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_mock_set_grants" ADD CONSTRAINT "institution_mock_set_grants_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
