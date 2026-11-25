import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";

export const SESSION_COOKIE = "mj_session";
const SESSION_DAYS = 30;

export type AuthUser = { id: string; email: string; name: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("scrypt:")) {
    const [, salt, hash] = stored.split(":");
    const next = scryptSync(password, salt, 32);
    const prev = Buffer.from(hash, "hex");
    return prev.length === next.length && timingSafeEqual(prev, next);
  }
  // legacy local demo hashes (browser SHA-256 with prefix)
  const legacy = createHash("sha256").update(`majungmul:${password}`).digest("hex");
  return stored === legacy || stored === `plain:${password}`;
}

function cookieSecureFlag() {
  // Only set Secure when HTTPS is actually used (HTTP EC2 would drop the cookie).
  return process.env.COOKIE_SECURE === "1" ? "; Secure" : "";
}

export function sessionCookieValue(token: string) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${cookieSecureFlag()}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecureFlag()}`;
}

export function readSessionToken(request: Request) {
  const raw = request.headers.get("cookie") || "";
  const parts = raw.split(/;\s*/);
  for (const part of parts) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k !== SESSION_COOKIE) continue;
    return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

export async function createSession(userId: string) {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}::uuid, ${tokenHash}, ${expires})
  `;
  return { token, expires };
}

export async function destroySession(token: string | null) {
  if (!token) return;
  const db = getDb();
  await db`delete from sessions where token_hash = ${hashToken(token)}`;
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const db = getDb();
  const rows = await db`
    select u.id, u.email, u.name
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)}
      and s.expires_at > now()
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: String(row.id), email: String(row.email), name: String(row.name || "") };
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}
