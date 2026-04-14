export type MailDirection = "incoming" | "outgoing";

export type MailboxStatus = "idle" | "syncing" | "ok" | "error";

export type MailContact = {
  name: string | null;
  address: string;
};

export type MailboxRecord = {
  id: number;
  email: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  encryptedPassword: string;
  status: MailboxStatus;
  lastSyncStartedAt: string | null;
  lastSyncFinishedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SyncCursorRecord = {
  mailboxId: number;
  folderName: string;
  lastUid: number;
  updatedAt: string;
};

export type MessageRecord = {
  id: number;
  mailboxId: number;
  mailboxEmail: string;
  folderName: string;
  externalUid: number;
  messageId: string | null;
  direction: MailDirection;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  syncedAt: string;
};

export type AuditLogRecord = {
  id: number;
  username: string;
  action: string;
  messageId: number | null;
  createdAt: string;
};

export type SyncRunRecord = {
  id: number;
  mailboxId: number;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "error";
  incomingCount: number;
  outgoingCount: number;
  errorMessage: string | null;
};

export type MessageListFilters = {
  mailboxId?: number;
  direction?: MailDirection;
  search?: string;
  fromDate?: string;
  toDate?: string;
};

export type SyncMessage = {
  uid: number;
  messageId: string | null;
  subject: string | null;
  sentAt: string | null;
  receivedAt?: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  from: MailContact[];
  to: MailContact[];
  cc: MailContact[];
  bcc: MailContact[];
};
