-- Prevent multiple active sync jobs for the same mailbox.
CREATE UNIQUE INDEX "SyncJob_mailboxId_active_unique"
ON "SyncJob"("mailboxId")
WHERE status IN ('queued', 'running');
