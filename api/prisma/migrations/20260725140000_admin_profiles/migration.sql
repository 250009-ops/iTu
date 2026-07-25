-- Admin capability profiles for invited admins
CREATE TABLE IF NOT EXISTS "admin_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permissions" JSONB,
    "invited_by_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_profiles_user_id_key" ON "admin_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "admin_profiles_invited_by_id_idx" ON "admin_profiles"("invited_by_id");

ALTER TABLE "admin_profiles"
  ADD CONSTRAINT "admin_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_profiles"
  ADD CONSTRAINT "admin_profiles_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
