import { cookies } from "next/headers";
import type { AuthUser } from "@/types/auth";
import { applyProxyHeaders } from "@/lib/server-proxy-headers";
import { API_BASE_URL } from "@/utils/env";

/**
 * Server-side auth plumbing — shared by the Route Handlers under
 * `src/app/api/auth/`.
 *
 * The backend's login JWT is written to an HttpOnly cookie here, so it is
 * never reachable from client-side JavaScript. Protected calls (backend
 * `/api/auth/me`, cart and orders) run from Route Handlers that read the
 * cookie and send the JWT as a Bearer token.
 */

const TOKEN_COOKIE = "ap_token";

/** Matches the backend's default JWT lifetime (JWT_EXPIRES_IN=7d). */
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Server-side view of a user — same safe subset the UI receives. */
export type BackendAuthUser = AuthUser;

interface BackendJson {
  success?: unknown;
  message?: unknown;
  token?: unknown;
  emailSent?: unknown;
  data?: unknown;
}

/** Parses a backend user record — ignoring fields we do not display. */
export function coerceUser(data: unknown): BackendAuthUser | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  if (typeof record.name !== "string") return null;
  if (record.email !== null && typeof record.email !== "string") return null;
  return {
    id: record.id,
    name: record.name,
    email: typeof record.email === "string" ? record.email : null,
    phone: typeof record.phone === "string" ? record.phone : record.phone === null ? null : undefined,
    isEmailVerified: record.isEmailVerified === true,
    isPhoneVerified:
      typeof record.isPhoneVerified === "boolean"
        ? record.isPhoneVerified
        : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
  };
}

/**
 * POSTs a JSON body to the backend and returns status + parsed body.
 * Network failures map to a 502-shaped response so callers can render a
 * retryable error instead of throwing into the UI.
 */
export async function backendPost(
  path: string,
  body: unknown,
): Promise<{ status: number; body: BackendJson; reachable: boolean } | null> {
  try {
    const headers = new Headers({ "Content-Type": "application/json" });
    await applyProxyHeaders(headers);
    const response = await fetch(`${API_BASE_URL}/api/auth${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });
    const data = (await response.json().catch(() => ({}))) as BackendJson;
    return { status: response.status, body: data ?? {}, reachable: true };
  } catch {
    return null;
  }
}

/** Reads the backend message when it is a usable string. */
export function backendMessage(body: BackendJson, fallback: string): string {
  const message = body.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function isEmailSent(body: BackendJson): boolean {
  return body.emailSent === true;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(TOKEN_COOKIE)?.value;
}

/**
 * Calls backend `GET /api/auth/me` with the cookie's JWT as a Bearer token.
 * Returns the user when the session is still valid, otherwise null. The
 * token is used in-memory only — never logged or returned to the client.
 */
export async function fetchCurrentUser(): Promise<BackendAuthUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  try {
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    await applyProxyHeaders(headers);
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json().catch(() => null)) as BackendJson | null;
    return data ? coerceUser(data.data) : null;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = TOKEN_COOKIE;
