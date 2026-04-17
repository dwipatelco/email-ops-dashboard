import { describe, expect, test } from "vitest";

import {
  normalizeMailboxIds,
  resolveMessageQuery,
} from "../src/app/(app)/messages/queries";

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

  test("normalizes repeated mailbox ids into a unique list", () => {
    expect(
      normalizeMailboxIds(["mailbox-2", "mailbox-1", "mailbox-2", ""])
    ).toEqual(["mailbox-2", "mailbox-1"]);
  });

  test("returns undefined when mailbox ids are empty", () => {
    expect(normalizeMailboxIds(undefined)).toBeUndefined();
    expect(normalizeMailboxIds("")).toBeUndefined();
    expect(normalizeMailboxIds(["", "   "])).toBeUndefined();
  });
});
