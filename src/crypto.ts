import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_LENGTH = 12;

function decodeKey(encryptionKey: string): Buffer {
  const key = Buffer.from(encryptionKey, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

export function validateEncryptionKey(encryptionKey: string): void {
  decodeKey(encryptionKey);
}

export function encryptSecret(secret: string, encryptionKey: string): string {
  const key = decodeKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString("base64")).join(":");
}

export function decryptSecret(payload: string, encryptionKey: string): string {
  const key = decodeKey(encryptionKey);
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split(":");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Encrypted payload is malformed");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
