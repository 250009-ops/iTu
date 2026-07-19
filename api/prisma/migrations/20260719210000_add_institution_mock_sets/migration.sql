-- CreateTable
CREATE TABLE "institution_mock_sets" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_mock_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_mock_set_items" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "institution_mock_set_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_mock_set_grants" (
    "id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "granted_by_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institution_mock_set_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institution_mock_sets_slug_key" ON "institution_mock_sets"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "institution_mock_set_items_package_id_key" ON "institution_mock_set_items"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "institution_mock_set_items_set_id_package_id_key" ON "institution_mock_set_items"("set_id", "package_id");

-- CreateIndex
CREATE INDEX "institution_mock_set_grants_institution_id_idx" ON "institution_mock_set_grants"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "institution_mock_set_grants_institution_id_set_id_key" ON "institution_mock_set_grants"("institution_id", "set_id");

-- AddForeignKey
ALTER TABLE "institution_mock_set_items" ADD CONSTRAINT "institution_mock_set_items_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "institution_mock_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_mock_set_items" ADD CONSTRAINT "institution_mock_set_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "mock_test_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_mock_set_grants" ADD CONSTRAINT "institution_mock_set_grants_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "institution_mock_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_mock_set_grants" ADD CONSTRAINT "institution_mock_set_grants_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
