import { NETWORK_ERROR_MESSAGE } from "@/lib/api-client";
import { readSessionToken } from "@/lib/server-auth";
import { applyProxyHeaders } from "@/lib/server-proxy-headers";
import { API_BASE_URL } from "@/utils/env";

/**
 * Server-side cart proxy plumbing.
 *
 * Cart routes are authenticated: the browser only holds the HttpOnly
 * `ap_token` cookie, and these helpers read it on the server and forward it to
 * the backend as a Bearer token. No token is ever returned to the client.
 */

interface BackendCartBody {
  success?: unknown;
  message?: unknown;
  data?: unknown;
}

export interface BackendCartResult {
  status: number;
  body: BackendCartBody;
}

/**
 * Calls the backend cart API. A missing cookie maps to a 401-shaped result so
 * the client can distinguish "signed out" from a server failure.
 */
export async function cartBackend(
  path: string,
  init: RequestInit,
): Promise<BackendCartResult | null> {
  const token = await readSessionToken();
  if (!token) {
    return {
      status: 401,
      body: { success: false, message: "Please sign in to use your bag." },
    };
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  await applyProxyHeaders(headers);

  try {
    const response = await fetch(`${API_BASE_URL}/api/cart${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as unknown;
    return {
      status: response.status,
      body:
        body && typeof body === "object"
          ? (body as BackendCartBody)
          : { success: false },
    };
  } catch {
    return null;
  }
}

/** Converts a backend cart result into this app's `{ ok, ... }` envelope. */
export function cartProxyResponse(
  result: BackendCartResult | null,
  fallbackError: string,
): Response {
  if (!result) {
    return Response.json(
      { ok: false, error: NETWORK_ERROR_MESSAGE },
      { status: 502 },
    );
  }

  const message =
    typeof result.body.message === "string" && result.body.message.trim()
      ? result.body.message
      : fallbackError;

  if (result.status === 401) {
    return Response.json(
      { ok: false, error: message, unauthorized: true },
      { status: 401 },
    );
  }

  if (result.body.success === true) {
    return Response.json(
      { ok: true, data: result.body.data },
      { status: result.status },
    );
  }

  return Response.json(
    { ok: false, error: message },
    { status: result.status },
  );
}
