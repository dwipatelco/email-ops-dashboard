import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import path from "node:path";

import { encryptSecret } from "./crypto.js";
import type { Database } from "./db.js";
import { SyncService } from "./services/sync-service.js";
import type { MailContact, MessageListFilters, MessageRecord } from "./types.js";

type AppOptions = {
  db: Database;
  sessionSecret: string;
  adminUsername: string;
  adminPassword: string;
  encryptionKey: string;
  pollIntervalMs: number;
  syncService?: SyncService;
};

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
    username?: string;
  }
}

const projectRoot = process.cwd();

function requireAuth(request: Request, response: Response, next: NextFunction): void {
  if (!request.session.authenticated) {
    response.redirect("/login");
    return;
  }

  next();
}

function parseContacts(payload: string): MailContact[] {
  try {
    return JSON.parse(payload) as MailContact[];
  } catch {
    return [];
  }
}

function buildFilters(query: Request["query"]): MessageListFilters {
  return {
    mailboxId: typeof query.mailboxId === "string" && query.mailboxId ? Number(query.mailboxId) : undefined,
    direction:
      query.direction === "incoming" || query.direction === "outgoing"
        ? query.direction
        : undefined,
    search: typeof query.search === "string" && query.search ? query.search : undefined,
    fromDate: typeof query.fromDate === "string" && query.fromDate ? query.fromDate : undefined,
    toDate: typeof query.toDate === "string" && query.toDate ? query.toDate : undefined
  };
}

function decorateMessage(message: MessageRecord) {
  return {
    ...message,
    fromContacts: parseContacts(message.from),
    toContacts: parseContacts(message.to),
    ccContacts: parseContacts(message.cc),
    bccContacts: parseContacts(message.bcc)
  };
}

export function buildApp(options: AppOptions) {
  const app = express();
  const syncService = options.syncService ?? new SyncService(options.db, { encryptionKey: options.encryptionKey });

  app.set("view engine", "ejs");
  app.set("views", path.join(projectRoot, "src", "views"));
  app.use("/assets", express.static(path.join(projectRoot, "src", "public")));
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: options.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax"
      }
    })
  );
  app.use((request, response, next) => {
    response.locals.currentUser = request.session.username ?? null;
    next();
  });

  app.get("/login", (request, response) => {
    if (request.session.authenticated) {
      response.redirect("/");
      return;
    }

    response.render("login", { error: null });
  });

  app.post("/login", (request, response) => {
    const { username, password } = request.body as Record<string, string>;
    if (username === options.adminUsername && password === options.adminPassword) {
      request.session.authenticated = true;
      request.session.username = username;
      response.redirect("/");
      return;
    }

    response.status(401).render("login", { error: "Invalid credentials" });
  });

  app.post("/logout", (request, response) => {
    request.session.destroy(() => {
      response.redirect("/login");
    });
  });

  app.use(requireAuth);

  app.get("/", (_request, response) => {
    response.redirect("/messages");
  });

  app.get("/mailboxes", (_request, response) => {
    response.render("mailboxes", {
      mailboxes: options.db.mailboxes.list()
    });
  });

  app.get("/mailboxes/new", (_request, response) => {
    response.render("mailbox-form", {
      mailbox: null,
      action: "/mailboxes",
      title: "Add Mailbox"
    });
  });

  app.post("/mailboxes", (request, response) => {
    const secure = request.body.secure === "on";
    options.db.mailboxes.create({
      email: String(request.body.email),
      host: String(request.body.host),
      port: Number(request.body.port),
      secure,
      username: String(request.body.username),
      password: encryptSecret(String(request.body.password), options.encryptionKey)
    });
    response.redirect("/mailboxes");
  });

  app.get("/mailboxes/:id/edit", (request, response) => {
    const mailbox = options.db.mailboxes.getById(Number(request.params.id));
    if (!mailbox) {
      response.status(404).send("Mailbox not found");
      return;
    }

    response.render("mailbox-form", {
      mailbox,
      action: `/mailboxes/${mailbox.id}/update`,
      title: "Edit Mailbox"
    });
  });

  app.post("/mailboxes/:id/update", (request, response) => {
    const mailboxId = Number(request.params.id);
    const mailbox = options.db.mailboxes.getById(mailboxId);
    if (!mailbox) {
      response.status(404).send("Mailbox not found");
      return;
    }

    const nextPassword = request.body.password
      ? encryptSecret(String(request.body.password), options.encryptionKey)
      : mailbox.encryptedPassword;

    options.db.mailboxes.update(mailboxId, {
      email: String(request.body.email),
      host: String(request.body.host),
      port: Number(request.body.port),
      secure: request.body.secure === "on",
      username: String(request.body.username),
      password: nextPassword
    });
    response.redirect("/mailboxes");
  });

  app.post("/mailboxes/:id/delete", (request, response) => {
    options.db.mailboxes.delete(Number(request.params.id));
    response.redirect("/mailboxes");
  });

  app.post("/mailboxes/:id/sync", async (request, response) => {
    try {
      await syncService.syncMailbox(Number(request.params.id));
      response.redirect("/mailboxes");
    } catch (error) {
      response.status(500).render("error", {
        message: error instanceof Error ? error.message : "Sync failed"
      });
    }
  });

  app.get("/messages", (request, response) => {
    const filters = buildFilters(request.query);
    const messages = options.db.messages.list(filters).map(decorateMessage);
    response.render("messages", {
      messages,
      mailboxes: options.db.mailboxes.list(),
      filters,
      syncRuns: options.db.syncRuns.listRecent()
    });
  });

  app.get("/messages/:id", (request, response) => {
    const message = options.db.messages.getById(Number(request.params.id));
    if (!message) {
      response.status(404).send("Message not found");
      return;
    }

    options.db.auditLogs.create(request.session.username ?? options.adminUsername, "view_message", message.id);
    response.render("message-detail", {
      message: decorateMessage(message)
    });
  });

  return app;
}
