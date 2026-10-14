-- Phase 6: make automatic reminder generation duplicate-safe.
-- One reminder per (type, relatedId) obligation. `relatedId` is nullable and
-- Postgres indexes treat NULLs as distinct, so manually-created reminders with
-- no related record are unaffected.
CREATE UNIQUE INDEX "Reminder_type_relatedId_key" ON "Reminder"("type", "relatedId");
