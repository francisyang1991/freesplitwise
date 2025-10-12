-- Add inviteCode column and unique index if they do not exist
ALTER TABLE "Group"
  ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Group_inviteCode_key'
  ) THEN
    CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");
  END IF;
END $$;
