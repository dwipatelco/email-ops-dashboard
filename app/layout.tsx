import type { Metadata } from "next";

import "./globals.css";
import { Geist, Public_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const publicSansHeading = Public_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
