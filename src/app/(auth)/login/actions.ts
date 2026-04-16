"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildSessionCookie, clearSessionCookie, createSessionCookieValue, verifyAdminCredentials } from "@/lib/server/auth";
import { env } from "@/lib/server/env";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const isValid = await verifyAdminCredentials({
    username,
    password,
    adminUsername: env.ADMIN_USERNAME,
    adminPassword: env.ADMIN_PASSWORD
  });

  if (!isValid) {
    redirect("/login?error=1");
  }

  const cookieStore = await cookies();
  const token = await createSessionCookieValue({
    username,
    secret: env.SESSION_SECRET
  });

  cookieStore.set({
    name: "monitor_email_session",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set("monitor_email_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 0
  });

  clearSessionCookie();
  redirect("/login");
}
