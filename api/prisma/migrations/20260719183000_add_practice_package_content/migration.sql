-- CreateTable
CREATE TABLE "practice_package_units" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_package_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_package_writing_prompts" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_package_writing_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_practice_unit_access" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "remaining" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_practice_unit_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_practice_prompt_access" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "remaining" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_practice_prompt_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practice_package_units_unit_id_key" ON "practice_package_units"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_package_units_package_id_unit_id_key" ON "practice_package_units"("package_id", "unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_package_writing_prompts_prompt_id_key" ON "practice_package_writing_prompts"("prompt_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_package_writing_prompts_package_id_prompt_id_key" ON "practice_package_writing_prompts"("package_id", "prompt_id");

-- CreateIndex
CREATE INDEX "student_practice_unit_access_student_id_unit_id_idx" ON "student_practice_unit_access"("student_id", "unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_practice_unit_access_student_id_unit_id_order_id_key" ON "student_practice_unit_access"("student_id", "unit_id", "order_id");

-- CreateIndex
CREATE INDEX "student_practice_prompt_access_student_id_prompt_id_idx" ON "student_practice_prompt_access"("student_id", "prompt_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_practice_prompt_access_student_id_prompt_id_order_id_key" ON "student_practice_prompt_access"("student_id", "prompt_id", "order_id");

-- AddForeignKey
ALTER TABLE "practice_package_units" ADD CONSTRAINT "practice_package_units_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "practice_product_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_package_units" ADD CONSTRAINT "practice_package_units_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "practice_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_package_writing_prompts" ADD CONSTRAINT "practice_package_writing_prompts_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "practice_product_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_package_writing_prompts" ADD CONSTRAINT "practice_package_writing_prompts_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "writing_practice_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_practice_unit_access" ADD CONSTRAINT "student_practice_unit_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_practice_unit_access" ADD CONSTRAINT "student_practice_unit_access_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "practice_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_practice_unit_access" ADD CONSTRAINT "student_practice_unit_access_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_practice_prompt_access" ADD CONSTRAINT "student_practice_prompt_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_practice_prompt_access" ADD CONSTRAINT "student_practice_prompt_access_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "writing_practice_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_practice_prompt_access" ADD CONSTRAINT "student_practice_prompt_access_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
