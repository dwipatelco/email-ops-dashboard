"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowsClockwiseIcon,
  ChartBarIcon,
  CommandIcon,
  EnvelopeSimpleIcon,
  GearSixIcon,
  HouseIcon,
  SignOutIcon,
  StackIcon,
} from "@phosphor-icons/react";

import { AppLiveRefresh } from "@/components/features/app-live-refresh";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: HouseIcon },
  { href: "/messages", label: "Messages", icon: EnvelopeSimpleIcon },
  { href: "/mailboxes", label: "Mailboxes", icon: StackIcon },
  { href: "/system", label: "System", icon: GearSixIcon },
] as const;

const titleByPath: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/messages": "Messages",
  "/mailboxes": "Mailboxes",
  "/system": "System",
};

export function AppShellClient({
  username,
  children,
  logoutAction,
}: {
  username: string;
  children: React.ReactNode;
  logoutAction: (...args: unknown[]) => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);

  const pageTitle = useMemo(() => {
    if (pathname.startsWith("/messages/")) {
      return "Message Detail";
    }

    return titleByPath[pathname] ?? "Mail Monitor";
  }, [pathname]);

  return (
    <SidebarProvider>
      <AppLiveRefresh />
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                isActive={pathname === "/dashboard"}
              >
                <Link href="/dashboard">
                  <ChartBarIcon />
                  <span>Mail Monitor</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <div className="flex flex-col gap-2 rounded-lg border border-sidebar-border p-3 text-xs text-sidebar-foreground/80">
            <div className="flex items-center justify-between gap-2">
              <span>Signed in as</span>
              <Badge variant="secondary">Admin</Badge>
            </div>
            <p className="truncate font-medium text-sidebar-foreground">
              {username}
            </p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              <SignOutIcon data-icon="inline-start" />
              Logout
            </Button>
          </form>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="flex flex-col">
                <h1 className="text-base font-semibold md:text-lg">
                  {pageTitle}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Operational email monitoring
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandOpen(true)}
              >
                <CommandIcon data-icon="inline-start" />
                Quick Search
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => router.refresh()}
              >
                <ArrowsClockwiseIcon />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <Command>
          <CommandInput placeholder="Jump to a page..." />
          <CommandList>
            <CommandEmpty>No matching route.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    onSelect={() => {
                      setCommandOpen(false);
                      router.push(item.href);
                    }}
                  >
                    <Icon />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </SidebarProvider>
  );
}
