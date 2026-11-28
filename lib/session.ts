import crypto from "crypto";
import { cookies } from "next/headers";

// Customer login session: a signed cookie holding the customer's id and an expiry.
// Signed with SESSION_SECRET (falls back to ADMIN_PASSWORD if you haven't set one).
export const COOKIE = "pg_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Set SESSION_SECRET in .env");
  return s;
}
const sign = (payload: string) => crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export function makeToken(leadId: string) {
  const payload = Buffer.from(JSON.stringify({ lid: leadId, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token?: string | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const expected = sign(payload);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.lid !== "string" || typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data.lid;
  } catch {
    return null;
  }
}

// The logged-in customer's id, or null.
export async function currentLeadId(): Promise<string | null> {
  return readToken((await cookies()).get(COOKIE)?.value);
}
