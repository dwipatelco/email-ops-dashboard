import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === "test"
    ? "postgresql://postgres:postgres@localhost:5432/monitor_email"
    : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
