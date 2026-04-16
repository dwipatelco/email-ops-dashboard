import { beforeEach, describe, expect, test, vi } from "vitest";

const countEventsVersion = vi.fn(async () => "0-0-0");
const getSession = vi.fn(async () => ({ username: "admin" as const }));

vi.mock("@/app/(app)/system/queries", () => ({
  countEventsVersion,
}));

vi.mock("@/lib/server/session", () => ({
  getSession,
}));

vi.mock("@/lib/server/env", () => ({
  env: {
    EVENTS_POLL_INTERVAL_MS: 25,
  },
}));

describe("GET /api/events", () => {
  beforeEach(() => {
    countEventsVersion.mockClear();
    getSession.mockReset();
    getSession.mockResolvedValue({ username: "admin" });
  });

  test("returns 401 when unauthenticated", async () => {
    getSession.mockResolvedValueOnce(null);
    const { GET } = await import("../src/app/api/events/route");

    const request = new Request("http://localhost/api/events");
    const response = await GET(request as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  test("returns event stream when authenticated", async () => {
    const { GET } = await import("../src/app/api/events/route");

    const request = new Request("http://localhost/api/events");
    const response = await GET(request as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
  });
});
