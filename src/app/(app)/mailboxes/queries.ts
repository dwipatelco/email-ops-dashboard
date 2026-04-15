import { MailboxStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function getMailboxes() {
  return await prisma.mailbox.findMany({
    include: {
      syncJobs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { email: "asc" }
  });
}

export async function getMailbox(id: string) {
  return await prisma.mailbox.findUnique({ where: { id } });
}

export function normalizeMailboxStatus(status: MailboxStatus) {
  if (status === "ok") {
    return "healthy";
  }

  if (status === "error") {
    return "failing";
  }

  if (status === "syncing") {
    return "syncing";
  }

  return "idle";
}
