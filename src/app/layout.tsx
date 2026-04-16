import type { Metadata } from "next";

import "./globals.css";
import { Geist, Public_Sans, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

let workerStarted = false;

if (!workerStarted && process.env.NODE_ENV === "production") {
  workerStarted = true;
  import("../../worker/index").then(() => {
    console.log("Worker started");
  }).catch((err: Error) => {
    console.error("Worker failed to start", err);
  });
}

const publicSansHeading = Public_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Mail Monitor",
  description: "Operations dashboard for incoming and outgoing monitored email",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable, publicSansHeading.variable)}
    >
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
