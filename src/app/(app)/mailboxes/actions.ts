"use server";

import { revalidatePath } from "next/cache";

import { encryptSecret } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { prisma } from "@/lib/db/prisma";
import { queueMailboxSync } from "@/lib/server/sync";
import { requireSession } from "@/lib/server/session";

export async function createMailboxAction(formData: FormData) {
  await requireSession();
  const secure = String(formData.get("secure") ?? "on") === "on";

  await prisma.mailbox.create({
    data: {
      email: String(formData.get("email") ?? ""),
      host: String(formData.get("host") ?? ""),
      port: Number(formData.get("port") ?? 993),
      secure,
      username: String(formData.get("username") ?? ""),
      encryptedPassword: encryptSecret(String(formData.get("password") ?? ""), env.APP_ENCRYPTION_KEY)
    }
  });

  revalidatePath("/mailboxes");
  revalidatePath("/dashboard");
}

export async function updateMailboxAction(formData: FormData) {
  await requireSession();
  const mailboxId = String(formData.get("id") ?? "");
  if (!mailboxId) {
    return;
  }

  const secure = String(formData.get("secure") ?? "off") === "on";
  const passwordInput = String(formData.get("password") ?? "");

  await prisma.mailbox.update({
    where: { id: mailboxId },
    data: {
      email: String(formData.get("email") ?? ""),
      host: String(formData.get("host") ?? ""),
      port: Number(formData.get("port") ?? 993),
      secure,
      username: String(formData.get("username") ?? ""),
      ...(passwordInput
        ? {
            encryptedPassword: encryptSecret(passwordInput, env.APP_ENCRYPTION_KEY)
          }
        : {})
    }
  });

  revalidatePath("/mailboxes");
}

export async function deleteMailboxAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }

  await prisma.mailbox.delete({ where: { id } });
  revalidatePath("/mailboxes");
  revalidatePath("/messages");
  revalidatePath("/dashboard");
}

export async function queueMailboxSyncAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }

  await queueMailboxSync(id, "manual");
  revalidatePath("/mailboxes");
  revalidatePath("/system");
}
