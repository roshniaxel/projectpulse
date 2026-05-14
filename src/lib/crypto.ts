import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!raw) {
    throw new Error(
      "AUTH_SECRET (or NEXTAUTH_SECRET) is required to encrypt integration credentials"
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

// Encrypt a string. Output: base64(iv | authTag | ciphertext)
export function encrypt(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(token: string): string {
  if (!token) return "";
  const buf = Buffer.from(token, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
