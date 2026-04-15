"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition, useEffect, useRef } from "react";
import { SearchIcon, XIcon, FilterIcon } from "lucide-react";
import { MailDirection } from "@/generated/prisma/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MessagesToolbar({
  mailboxes,
  currentFilters,
}: {
  mailboxes: { id: string; email: string }[];
  currentFilters: {
    mailboxId?: string;
    direction?: string;
    folderName?: string;
    searchScope?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    pageSize?: string;
    view?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(currentFilters.search || "");

  const activeFiltersCount = [
    currentFilters.mailboxId,
    currentFilters.direction,
    currentFilters.folderName,
    currentFilters.fromDate,
    currentFilters.toDate,
  ].filter(Boolean).length;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      
      if (key !== "page") {
        params.set("page", "1");
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchValue !== (currentFilters.search || "")) {
        updateParam("search", searchValue);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchValue, updateParam, currentFilters.search]);

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-2 shadow-sm">
        {/* Left side: Search & basic filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search input with icon */}
          <div className="relative w-full max-w-sm sm:w-64">
            <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="h-9 w-full pl-8 pr-8"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {searchValue && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchValue("")}
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>

          {/* Mailbox Filter */}
          <Select
            value={currentFilters.mailboxId || "all"}
            onValueChange={(val) => updateParam("mailboxId", val)}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All mailboxes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All mailboxes</SelectItem>
              {mailboxes.map((mailbox) => (
                <SelectItem key={mailbox.id} value={mailbox.id}>
                  {mailbox.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-dashed">
                <FilterIcon className="size-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px] rounded-sm">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[320px] p-4">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Advanced Filters</h4>
                <FieldGroup className="grid gap-4">
                  <Field orientation="horizontal" className="items-center justify-between gap-4">
                    <FieldLabel htmlFor="direction" className="text-xs">Direction</FieldLabel>
                    <Select
                      value={currentFilters.direction || "all"}
                      onValueChange={(val) => updateParam("direction", val)}
                    >
                      <SelectTrigger id="direction" className="h-8 w-[160px]">
                        <SelectValue placeholder="All directions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All directions</SelectItem>
                        <SelectItem value="incoming">Incoming</SelectItem>
                        <SelectItem value="outgoing">Outgoing</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="horizontal" className="items-center justify-between gap-4">
                    <FieldLabel htmlFor="folderName" className="text-xs">Folder</FieldLabel>
                    <Select
                      value={currentFilters.folderName || "all"}
                      onValueChange={(val) => updateParam("folderName", val)}
                    >
                      <SelectTrigger id="folderName" className="h-8 w-[160px]">
                        <SelectValue placeholder="All folders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All folders</SelectItem>
                        <SelectItem value="Inbox">Inbox</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="horizontal" className="items-center justify-between gap-4">
                    <FieldLabel htmlFor="searchScope" className="text-xs">Search In</FieldLabel>
                    <Select
                      value={currentFilters.searchScope || "all"}
                      onValueChange={(val) => updateParam("searchScope", val)}
                    >
                      <SelectTrigger id="searchScope" className="h-8 w-[160px]">
                        <SelectValue placeholder="Subject + Body" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Subject + Body</SelectItem>
                        <SelectItem value="subject">Subject only</SelectItem>
                        <SelectItem value="body">Body only</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="horizontal" className="items-center justify-between gap-4">
                    <FieldLabel htmlFor="fromDate" className="text-xs">From Date</FieldLabel>
                    <Input
                      id="fromDate"
                      type="date"
                      className="h-8 w-[160px] text-xs"
                      value={currentFilters.fromDate || ""}
                      onChange={(e) => updateParam("fromDate", e.target.value)}
                    />
                  </Field>

                  <Field orientation="horizontal" className="items-center justify-between gap-4">
                    <FieldLabel htmlFor="toDate" className="text-xs">To Date</FieldLabel>
                    <Input
                      id="toDate"
                      type="date"
                      className="h-8 w-[160px] text-xs"
                      value={currentFilters.toDate || ""}
                      onChange={(e) => updateParam("toDate", e.target.value)}
                    />
                  </Field>
                </FieldGroup>
                
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete("mailboxId");
                      params.delete("direction");
                      params.delete("folderName");
                      params.delete("fromDate");
                      params.delete("toDate");
                      params.delete("searchScope");
                      params.delete("search");
                      params.set("page", "1");
                      setSearchValue("");
                      startTransition(() => {
                        router.push(`${pathname}?${params.toString()}`);
                      });
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right side: View Toggle & Rows per page */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border-r pr-2 mr-2">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={currentFilters.pageSize || "50"}
              onValueChange={(val) => updateParam("pageSize", val)}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue placeholder="50" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs
            value={currentFilters.view || "table"}
            onValueChange={(val) => updateParam("view", val)}
            className="w-[120px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
