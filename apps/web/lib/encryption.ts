import * as crypto from "crypto";

function getKey(passphrase: string): Buffer {
  return crypto.createHash("sha256").update(passphrase).digest();
}

export function encrypt_data(text: string, secret: string): string {
  // Convert your random string to a valid 32-byte key
  const key = getKey(secret);

  // Generate IV (Randomness for security)
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Return: IV + Tag + EncryptedData
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt_data(token: string, secret: string): string {
  const data = Buffer.from(token, "base64");

  // Extract parts
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const text = data.subarray(28);

  // Re-create the same key from your string
  const key = getKey(secret);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(text) + decipher.final("utf8");
}
