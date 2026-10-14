-- Add a unique login username to the owner account.
-- Backfills from the email local-part so existing rows satisfy NOT NULL,
-- then enforces uniqueness.

ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = COALESCE(NULLIF(split_part("email", '@', 1), ''), 'owner')
WHERE "username" IS NULL;

-- Resolve any residual collisions (e.g. two emails sharing a local-part).
WITH ranked AS (
    SELECT
        "id",
        "username",
        ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "createdAt", "id") AS rn
    FROM "User"
)
UPDATE "User" u
SET "username" = ranked."username" || '_' || substr(u."id", 1, 6)
FROM ranked
WHERE u."id" = ranked."id" AND ranked.rn > 1;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
