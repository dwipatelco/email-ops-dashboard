import { describe, expect, test } from "vitest";

import { decryptSecret, encryptSecret, validateEncryptionKey } from "../src/crypto.js";

describe("secret encryption", () => {
  test("round-trips mailbox passwords with AES-GCM", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const secret = "super-secret-password";

    const encrypted = encryptSecret(secret, key);

    expect(encrypted).not.toBe(secret);
    expect(decryptSecret(encrypted, key)).toBe(secret);
  });

  test("rejects invalid encryption keys before use", () => {
    expect(() => validateEncryptionKey("replace-with-32-byte-base64-key")).toThrow(
      "APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key"
    );
  });
});
