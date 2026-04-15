import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mail Monitor",
  description: "Operations dashboard for incoming and outgoing monitored email"
};

export default function HomePage() {
  redirect("/dashboard");
}
