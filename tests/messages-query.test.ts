import { describe, expect, test } from "vitest";

import { resolveMessageQuery } from "../src/app/(app)/messages/queries";

describe("message query resolution", () => {
  test("applies defaults for invalid values", () => {
    const result = resolveMessageQuery({
      page: 0,
      pageSize: -10,
      sortBy: "unknown",
      sortDir: "bad"
    });

    expect(result).toEqual({
      page: 1,
      pageSize: 50,
      sortBy: "receivedAt",
      sortDir: "desc"
    });
  });

  test("keeps explicit supported values", () => {
    const result = resolveMessageQuery({
      page: 3,
      pageSize: 100,
      sortBy: "mailbox",
      sortDir: "asc"
    });

    expect(result).toEqual({
      page: 3,
      pageSize: 100,
      sortBy: "mailbox",
      sortDir: "asc"
    });
  });

  test("caps page size to hard limit", () => {
    const result = resolveMessageQuery({
      page: 2,
      pageSize: 500,
      sortBy: "subject",
      sortDir: "desc"
    });

    expect(result.pageSize).toBe(100);
  });
});
