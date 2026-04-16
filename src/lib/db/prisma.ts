import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

const connectionString =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === "test"
    ? "postgresql://postgres:postgres@localhost:5432/monitor_email"
    : isBuildPhase
      ? "postgresql://placeholder:placeholder@placeholder:5432/placeholder"
    : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
