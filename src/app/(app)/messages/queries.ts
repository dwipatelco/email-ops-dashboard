import { MailDirection, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export type MessageSortBy = "receivedAt" | "syncedAt" | "subject" | "mailbox" | "direction";
export type MessageSortDir = "asc" | "desc";
export type ResolvedMessageQuery = {
  page: number;
  pageSize: number;
  sortBy: MessageSortBy;
  sortDir: MessageSortDir;
};

type MessageFilterInput = {
  mailboxId?: string;
  direction?: MailDirection;
  folderName?: "Inbox" | "Sent";
  searchScope?: "all" | "subject" | "body";
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: MessageSortBy;
  sortDir?: MessageSortDir;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function clampPage(value: number | undefined) {
  if (!value || Number.isNaN(value) || value < 1) {
    return DEFAULT_PAGE;
  }

  return Math.floor(value);
}

function clampPageSize(value: number | undefined) {
  if (!value || Number.isNaN(value) || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(MAX_PAGE_SIZE, Math.floor(value));
}

function toContactString(value: Prisma.JsonValue): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((entry) => {
      if (typeof entry !== "object" || !entry || !("address" in entry)) {
        return "";
      }

      const address = (entry as { address?: unknown }).address;
      return typeof address === "string" ? address : "";
    })
    .filter(Boolean)
    .join(", ");
}

function normalizeSortBy(value: string | undefined): MessageSortBy {
  if (value === "syncedAt" || value === "subject" || value === "mailbox" || value === "direction") {
    return value;
  }

  return "receivedAt";
}

function normalizeSortDir(value: string | undefined): MessageSortDir {
  return value === "asc" ? "asc" : "desc";
}

export function resolveMessageQuery(input: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}): ResolvedMessageQuery {
  return {
    page: clampPage(input.page),
    pageSize: clampPageSize(input.pageSize),
    sortBy: normalizeSortBy(input.sortBy),
    sortDir: normalizeSortDir(input.sortDir)
  };
}

function toEndOfDay(dateInput: string) {
  const date = new Date(dateInput);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function buildMessageOrderBy(sortBy: MessageSortBy, sortDir: MessageSortDir): Prisma.MessageOrderByWithRelationInput[] {
  const orderBy: Prisma.MessageOrderByWithRelationInput[] = [];

  if (sortBy === "mailbox") {
    orderBy.push({ mailbox: { email: sortDir } });
  } else if (sortBy === "subject") {
    orderBy.push({ subject: sortDir });
  } else if (sortBy === "direction") {
    orderBy.push({ direction: sortDir });
  } else if (sortBy === "syncedAt") {
    orderBy.push({ syncedAt: sortDir });
  } else {
    orderBy.push({ receivedAt: sortDir });
  }

  if (sortBy !== "receivedAt") {
    orderBy.push({ receivedAt: "desc" });
  }

  if (sortBy !== "syncedAt") {
    orderBy.push({ syncedAt: "desc" });
  }

  return orderBy;
}

export async function getMessages(filters: MessageFilterInput) {
  const where: Prisma.MessageWhereInput = {};

  if (filters.mailboxId) {
    where.mailboxId = filters.mailboxId;
  }

  if (filters.direction) {
    where.direction = filters.direction;
  }

  if (filters.folderName) {
    where.folderName = filters.folderName;
  }

  if (filters.search) {
    if (filters.searchScope === "subject") {
      where.subject = { contains: filters.search, mode: "insensitive" };
    } else if (filters.searchScope === "body") {
      where.bodyText = { contains: filters.search, mode: "insensitive" };
    } else {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
        { bodyText: { contains: filters.search, mode: "insensitive" } }
      ];
    }
  }

  if (filters.fromDate || filters.toDate) {
    where.receivedAt = {};
    if (filters.fromDate) {
      where.receivedAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.receivedAt.lte = toEndOfDay(filters.toDate);
    }
  }

  const { page, pageSize, sortBy, sortDir } = resolveMessageQuery({
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir
  });
  const total = await prisma.message.count({ where });
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(page, lastPage);
  const effectiveSkip = (effectivePage - 1) * pageSize;

  const [messages, mailboxes] = await Promise.all([
    prisma.message.findMany({
      where,
      select: {
        id: true,
        direction: true,
        subject: true,
        snippet: true,
        folderName: true,
        receivedAt: true,
        syncedAt: true,
        fromJson: true,
        toJson: true,
        mailbox: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: buildMessageOrderBy(sortBy, sortDir),
      take: pageSize,
      skip: effectiveSkip
    }),
    prisma.mailbox.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true
      }
    })
  ]);

  const items = messages.map((message) => ({
    ...message,
    fromText: toContactString(message.fromJson),
    toText: toContactString(message.toJson)
  }));

  return {
    mailboxes,
    items,
    messages: items,
    total,
    page: effectivePage,
    pageSize,
    sort: {
      by: sortBy,
      direction: sortDir
    }
  };
}

export async function getMessageDetail(id: string) {
  return await prisma.message.findUnique({
    where: { id },
    include: { mailbox: true }
  });
}
