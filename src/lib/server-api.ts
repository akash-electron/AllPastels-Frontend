import { NETWORK_ERROR_MESSAGE } from "@/lib/api-client";
import { readSessionToken } from "@/lib/server-auth";
import { applyProxyHeaders } from "@/lib/server-proxy-headers";
import { API_BASE_URL } from "@/utils/env";

/**
 * Server-side proxy plumbing for the authenticated backend APIs.
 *
 * The browser only holds the HttpOnly `ap_token` cookie. Route Handlers read
 * it here and forward it to the backend as a Bearer token, so no token ever
 * reaches client-side JavaScript.
 */

type AuthMode = "none" | "optional" | "required";

export interface BackendResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Calls a backend `/api` path. A missing token maps to a 401-shaped result for
 * required routes so the client can distinguish "signed out" from a failure.
 */
export async function backendApi(
  path: string,
  init: RequestInit = {},
  auth: AuthMode = "required",
): Promise<BackendResult | null> {
  const headers = new Headers(init.headers);

  if (auth !== "none") {
    const token = await readSessionToken();
    if (!token && auth === "required") {
      return {
        status: 401,
        body: {
          success: false,
          message: "Please sign in to continue.",
        },
      };
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body) headers.set("Content-Type", "application/json");

  await applyProxyHeaders(headers);

  try {
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as unknown;
    return {
      status: response.status,
      body:
        body && typeof body === "object"
          ? (body as Record<string, unknown>)
          : { success: false },
    };
  } catch {
    return null;
  }
}

/** Converts a backend result into this app's `{ ok, ... }` envelope. */
export function backendProxyResponse(
  result: BackendResult | null,
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
      {
        ok: true,
        data: result.body.data,
        ...(result.body.summary !== undefined
          ? { summary: result.body.summary }
          : {}),
        ...(typeof result.body.lookupToken === "string"
          ? { lookupToken: result.body.lookupToken }
          : {}),
        ...(typeof result.body.message === "string" && result.body.message.trim()
          ? { message: result.body.message }
          : {}),
        ...(typeof result.body.emailVerificationRequired === "boolean"
          ? { emailVerificationRequired: result.body.emailVerificationRequired }
          : {}),
        ...(typeof result.body.emailSent === "boolean"
          ? { emailSent: result.body.emailSent }
          : {}),
      },
      { status: result.status },
    );
  }

  return Response.json(
    { ok: false, error: message },
    { status: result.status },
  );
}
