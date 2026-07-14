import crypto from "node:crypto";

export type AuthCodePurpose = "verify-email" | "password-reset";

export const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
export const AUTH_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const AUTH_CODE_MAX_ATTEMPTS = 5;

export function generateAuthCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function authCodeExpiresAt() {
  return new Date(Date.now() + AUTH_CODE_TTL_MS);
}

export function hashAuthCode(code: string, email: string, purpose: AuthCodePurpose) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for authentication codes");
  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export function authCodeMatches(expectedHash: string, code: string, email: string, purpose: AuthCodePurpose) {
  const actualHash = hashAuthCode(code, email, purpose);
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function authCodeRetryAfter(createdAt: Date) {
  return Math.max(0, Math.ceil((AUTH_CODE_RESEND_COOLDOWN_MS - (Date.now() - createdAt.getTime())) / 1000));
}
