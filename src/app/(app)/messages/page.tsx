import { MailDirection } from "@/generated/prisma/client";

import { MessagesInbox } from "./_components/messages-inbox";
import { MessagesTable } from "./_components/messages-table";
import { MessagesToolbar } from "./_components/messages-toolbar";
import { MessageQuickView } from "./_components/message-quick-view";
import type { MessageQuickViewDetail } from "./_components/message-quick-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  getMessages,
  getMessageDetail,
  normalizeMailboxIds,
  type MessageSortBy,
  type MessageSortDir,
} from "@/app/(app)/messages/queries";
import { sanitizeEmailHtml } from "@/lib/server/sanitize";


export const dynamic = "force-dynamic";

type ViewMode = "table" | "inbox";
type SearchParamValue = string | string[] | undefined;

function toInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getViewMode(value: string | undefined): ViewMode {
  return value === "inbox" ? "inbox" : "table";
}

function getSingleParam(value: SearchParamValue) {
  return Array.isArray(value) ? value.at(-1) : value;
}

function getFolderName(value: string | undefined): "Inbox" | "Sent" | undefined {
  return value === "Inbox" || value === "Sent" ? value : undefined;
}

function getSearchScope(value: string | undefined): "all" | "subject" | "body" | undefined {
  return value === "subject" || value === "body" || value === "all"
    ? value
    : undefined;
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamValue>>;
}) {
  const params = await searchParams;
  const mailboxIds = normalizeMailboxIds(params.mailboxId);
  const page = toInt(getSingleParam(params.page), 1);
  const pageSize = Math.min(toInt(getSingleParam(params.pageSize), 50), 100);
  const view = getViewMode(getSingleParam(params.view));

  const filters = {
    mailboxIds,
    direction: (getSingleParam(params.direction) as MailDirection | undefined) ?? undefined,
    folderName: getFolderName(getSingleParam(params.folderName)),
    searchScope: getSearchScope(getSingleParam(params.searchScope)),
    search: getSingleParam(params.search),
    fromDate: getSingleParam(params.fromDate),
    toDate: getSingleParam(params.toDate),
    page,
    pageSize,
    sortBy: getSingleParam(params.sortBy) as MessageSortBy | undefined,
    sortDir: getSingleParam(params.sortDir) === "asc" ? "asc" : "desc",
  } as const;

  const data = await getMessages(filters);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const startItem = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const endItem =
    data.total === 0 ? 0 : Math.min(data.page * data.pageSize, data.total);

  // Quick view sheet fetching
  const quickViewMessageId = getSingleParam(params.messageId);
  let quickViewMessage: MessageQuickViewDetail | null = null;
  let sanitizedHtmlBody = null;

  if (quickViewMessageId) {
    quickViewMessage = await getMessageDetail(quickViewMessageId);
    if (quickViewMessage?.bodyHtml) {
      sanitizedHtmlBody = sanitizeEmailHtml(quickViewMessage.bodyHtml);
    }
  }

  function buildUrl(next: Record<string, string | string[] | undefined>) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item) {
            query.append(key, item);
          }
        }
        continue;
      }

      query.set(key, value);
    }

    for (const [key, value] of Object.entries(next)) {
      if (!value) {
        query.delete(key);
      } else if (Array.isArray(value)) {
        query.delete(key);
        for (const item of value) {
          if (item) {
            query.append(key, item);
          }
        }
      } else {
        query.set(key, value);
      }
    }

    const output = query.toString();
    return output ? `/messages?${output}` : "/messages";
  }

  function getSortHref(column: MessageSortBy) {
    const nextDir: MessageSortDir =
      data.sort.by === column && data.sort.direction === "desc" ? "asc" : "desc";

    return buildUrl({
      sortBy: column,
      sortDir: nextDir,
      page: "1",
    });
  }

  const sortHrefs: Record<MessageSortBy, string> = {
    receivedAt: getSortHref("receivedAt"),
    syncedAt: getSortHref("syncedAt"),
    subject: getSortHref("subject"),
    mailbox: getSortHref("mailbox"),
    direction: getSortHref("direction"),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Message Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Search, filter, sort, and page through monitored email activity.
        </p>
      </div>

      <MessagesToolbar
        mailboxes={data.mailboxes}
        currentFilters={{
          mailboxIds,
          direction: getSingleParam(params.direction),
          folderName: getSingleParam(params.folderName),
          searchScope: getSingleParam(params.searchScope),
          search: getSingleParam(params.search),
          fromDate: getSingleParam(params.fromDate),
          toDate: getSingleParam(params.toDate),
          pageSize: String(pageSize),
          view: view,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Showing {startItem} - {endItem} of {data.total} messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {view === "table" ? (
            <MessagesTable
              rows={data.items.map((message) => ({
                id: message.id,
                mailboxEmail: message.mailbox.email,
                direction: message.direction,
                folderName: message.folderName,
                fromText: message.fromText,
                toText: message.toText,
                subject: message.subject,
                snippet: message.snippet,
                receivedAt: message.receivedAt?.toISOString() ?? null,
                syncedAt: message.syncedAt.toISOString(),
              }))}
              sortBy={data.sort.by}
              sortDir={data.sort.direction}
              sortHrefs={sortHrefs}
            />
          ) : (
            <MessagesInbox
              rows={data.items.map((message) => ({
                id: message.id,
                mailboxEmail: message.mailbox.email,
                direction: message.direction,
                fromText: message.fromText,
                toText: message.toText,
                subject: message.subject,
                snippet: message.snippet,
                receivedAt: message.receivedAt?.toISOString() ?? null,
              }))}
            />
          )}

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={buildUrl({
                    page: String(data.page === 1 ? 1 : data.page - 1),
                  })}
                  aria-disabled={data.page === 1}
                />
              </PaginationItem>
              {Array.from({ length: totalPages })
                .slice(
                  Math.max(0, data.page - 3),
                  Math.min(totalPages, data.page + 2),
                )
                .map((_, index) => {
                  const pageNumber = Math.max(1, data.page - 2) + index;
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href={buildUrl({ page: String(pageNumber) })}
                        isActive={pageNumber === data.page}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
              <PaginationItem>
                <PaginationNext
                  href={buildUrl({
                    page: String(
                      data.page === totalPages ? totalPages : data.page + 1,
                    ),
                  })}
                  aria-disabled={data.page === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>

      <MessageQuickView
        message={quickViewMessage}
        sanitizedHtmlBody={sanitizedHtmlBody}
      />
    </div>
  );
}
