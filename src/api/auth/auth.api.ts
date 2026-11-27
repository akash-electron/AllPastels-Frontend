/**
 * Auth service — every client call for the email authentication flow.
 *
 * Split internally into two transports, mirroring what the backend offers:
 *  1. Direct backend calls for link-driven single-shot requests
 *     (`verifyEmail` follows the emailed link straight to the backend).
 *  2. Same-origin Route Handlers (`/api/auth/*`) for everything that is
 *     login-bound or sets the session: the handlers own the HttpOnly cookie
 *     write/read and the server-side Bearer `/me` lookup, so the JWT never
 *     reaches client-side JavaScript.
 *
 * Request handling (fetch, JSON, network mapping) comes from
 * `lib/api-client.ts`; user/result shapes come from `types/auth.ts`.
 * No token is ever logged, rendered or persisted here.
 */

import {
  NETWORK_ERROR_MESSAGE,
  apiPostBody,
  apiRequest,
  readRouteBody,
} from "@/lib/api-client";
import { API_BASE_URL } from "@/utils/env";
import type {
  AuthUser,
  ForgotPasswordResult,
  GoogleSignInResult,
  RegisterResult,
  RequestOtpResult,
  ResendVerificationResult,
  ResetPasswordResult,
  SessionRestoreResult,
  SignInResult,
  UpdateProfileInput,
  UpdateProfileResult,
  VerifyOtpResult,
  VerifyResult,
} from "@/types/auth";

/* ---------------------------------------------------------------------------
   Shared, private helpers
   --------------------------------------------------------------------------- */

/** Coerces a Route Handler's `user` payload defensively. */
function coerceRouteUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.name !== "string") return null;
  if (record.email !== null && typeof record.email !== "string") return null;
  return {
    id: typeof record.id === "string" ? record.id : "",
    name: record.name,
    email: typeof record.email === "string" ? record.email : null,
    phone:
      typeof record.phone === "string"
        ? record.phone
        : record.phone === null
          ? null
          : undefined,
    isEmailVerified: record.isEmailVerified === true,
    isPhoneVerified:
      typeof record.isPhoneVerified === "boolean"
        ? record.isPhoneVerified
        : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
  };
}

/* ---------------------------------------------------------------------------
   Verify email — direct backend GET (already integrated)
   --------------------------------------------------------------------------- */

/** Calls `GET /api/auth/verify-email?token=...` on the backend. */
export async function verifyEmail(
  token: string,
  options?: { timeoutMs?: number },
): Promise<VerifyResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "invalid" };
  // Bound the wait so the UI can never hang on "Verifying": an unsettled
  // request aborts and surfaces as retryable `network`, never as a
  // consumed/invalid link. The token itself is never logged or exposed here.
  const timeoutMs = options?.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(
        `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(trimmed)}`,
        { method: "GET", signal: controller.signal },
      );
    } catch {
      return { ok: false, reason: "network" };
    }
    if (response.ok) return { ok: true };
    // Distinguish link problems (4xx) from server problems (5xx) so the UI
    // never mislabels a retryable outage as an expired link.
    if (response.status >= 500) return { ok: false, reason: "server" };
    try {
      const body = (await response.json()) as { code?: unknown };
      if (body && body.code === "expired") return { ok: false, reason: "expired" };
      if (body && body.code === "server") return { ok: false, reason: "server" };
    } catch {
      // Aborted while reading the body, or a non-JSON error body: a timeout
      // stays retryable instead of looking like a bad link.
      if (controller.signal.aborted) return { ok: false, reason: "network" };
      // Non-JSON error body — fall through to status-based mapping.
    }
    if (response.status === 429) return { ok: false, reason: "server" };
    return { ok: false, reason: "invalid" };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------------------
   Customer flows — via same-origin Route Handlers
   --------------------------------------------------------------------------- */

/**
 * `POST /register` — creates the customer and (when SMTP is configured on
 * the backend) sends a verification email. Whether an email actually went
 * out comes back as `emailSent` for the UI to reflect truthfully.
 */
export async function registerCustomer(input: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  const response = await apiPostBody("/auth/register", {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(response, "Registration did not go through.");
  if (body.ok !== true) {
    return { ok: false, error: body.error as string };
  }
  return {
    ok: true,
    emailSent: body.emailSent === true,
    message: typeof body.message === "string" ? body.message : "Registration successful.",
  };
}

/**
 * `POST /login` — credentials check + JWT cookie write on our Route
 * Handler. `verificationRequired` distinguishes the backend's 403 (email
 * not verified) from invalid credentials so the form can offer a resend.
 */
export async function signInCustomer(input: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  const response = await apiPostBody("/auth/login", {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(response, "Email or password does not match.");
  if (body.ok !== true) {
    return {
      ok: false,
      error: body.error as string,
      verificationRequired: body.verificationRequired === true,
    };
  }
  const user = coerceRouteUser(body.user);
  if (!user) {
    return { ok: false, error: "Sign-in did not complete — please try again." };
  }
  return { ok: true, user };
}

/**
 * `GET /auth/session` → Route Handler → backend `GET /me` — re-establishes
 * the session from the HttpOnly cookie. `{ ok: false }` means signed out
 * (the cookie is stale or missing) and is never an error worth alerting
 * about.
 */
export async function restoreSession(): Promise<SessionRestoreResult> {
  const response = await apiRequest("/auth/session", { cache: "no-store" });
  if (!response || !response.ok) return { ok: false };
  const body = await readRouteBody(response, "No active session.");
  const user = body.ok === true ? coerceRouteUser(body.user) : null;
  if (user) return { ok: true, user };
  return { ok: false };
}

/**
 * `PUT /auth/profile` — updates the signed-in customer's own profile. A
 * changed email is re-verified by the backend; the UI surfaces that state
 * rather than assuming the new address is immediately usable for login.
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  let response: Response | null;
  try {
    response = await apiRequest("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: (input.phone ?? "").trim(),
      }),
    });
  } catch {
    response = null;
  }
  if (!response) return { ok: false, error: NETWORK_ERROR_MESSAGE };

  const body = await readRouteBody(response, "Profile update did not go through.");
  if (body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : "Profile update did not go through.",
      unauthorized: body.unauthorized === true || response.status === 401,
    };
  }

  const user = coerceRouteUser(body.data);
  if (!user) {
    return { ok: false, error: "The profile update response was incomplete." };
  }

  return {
    ok: true,
    user,
    emailVerificationRequired: body.emailVerificationRequired === true,
    emailSent: body.emailSent === true,
    message:
      typeof body.message === "string" ? body.message : "Profile updated.",
  };
}

/**
 * `POST /auth/logout` — clears the session cookie server-side. Fire-and-
 * forget by design: the caller drops the client-side session immediately.
 */
export async function signOutRequest(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Cookie clearing must never block sign-out.
  }
}

/**
 * `POST /resend-verification` — asks the backend to rotate and (re)send the
 * verification email. The backend answers generically on purpose, so the UI
 * mirrors that shape rather than asserting a definite delivery.
 */
export async function resendVerification(
  email: string,
): Promise<ResendVerificationResult> {
  const response = await apiPostBody("/auth/resend-verification", {
    email: email.trim().toLowerCase(),
  });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(response, "Verification email was not sent.");
  if (body.ok !== true) {
    return { ok: false, error: body.error as string };
  }
  return {
    ok: true,
    message: typeof body.message === "string" ? body.message : undefined,
  };
}

/**
 * `POST /forgot-password` — asks the backend to issue a single-use reset
 * token and (when SMTP is configured) email the reset link. The response is
 * generic so it never reveals whether an account exists; `emailSent` reports
 * whether delivery is enabled and lets the UI avoid promising an email.
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const response = await apiPostBody("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(response, "Request did not go through.");
  if (body.ok !== true) return { ok: false, error: body.error as string };
  return {
    ok: true,
    emailSent: body.emailSent === true,
    message:
      typeof body.message === "string"
        ? body.message
        : "If an account with that email exists, a password reset link has been sent.",
  };
}

/** `POST /reset-password` — sets the new password with a valid reset token. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const response = await apiPostBody("/auth/reset-password", { token, newPassword });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(
    response,
    "That reset link is invalid or has expired — request a new one.",
  );
  if (body.ok !== true) return { ok: false, error: body.error as string };
  return { ok: true };
}

/**
 * `POST /auth/google` — exchanges a Google ID token for a session. The
 * Route Handler writes the JWT to the HttpOnly cookie; we only receive the
 * profile.
 */
export async function signInWithGoogle(idToken: string): Promise<GoogleSignInResult> {
  const response = await apiPostBody("/auth/google", { idToken });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(response, "Google sign-in did not complete.");
  if (body.ok !== true) {
    return { ok: false, error: body.error as string };
  }
  const user = coerceRouteUser(body.user);
  if (!user) {
    return { ok: false, error: "Google sign-in did not complete — please try again." };
  }
  return { ok: true, user };
}

/**
 * `POST /auth/otp/request` — asks the backend to send a WhatsApp OTP.
 */
export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const response = await apiPostBody("/auth/otp/request", {
    phone: phone.trim(),
  });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(response, "Could not send the code.");
  if (body.ok !== true) {
    const retryAfter =
      typeof body.retryAfter === "number" ? body.retryAfter : undefined;
    return { ok: false, error: body.error as string, retryAfter };
  }
  return {
    ok: true,
    message:
      typeof body.message === "string" ? body.message : "Code sent.",
    expiresIn: typeof body.expiresIn === "number" ? body.expiresIn : 300,
    resendIn: typeof body.resendIn === "number" ? body.resendIn : 60,
  };
}

/**
 * `POST /auth/otp/verify` — verifies the WhatsApp OTP (and optional name
 * for first-time users) and establishes the session.
 */
export async function verifyOtp(input: {
  phone: string;
  code: string;
  name?: string;
}): Promise<VerifyOtpResult> {
  const response = await apiPostBody("/auth/otp/verify", {
    phone: input.phone.trim(),
    code: input.code.trim(),
    ...(input.name ? { name: input.name.trim() } : {}),
  });
  if (!response) {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
  const body = await readRouteBody(response, "Verification did not complete.");
  if (body.ok !== true) {
    if (body.nameRequired === true) {
      return { ok: false, error: body.error as string, nameRequired: true };
    }
    return { ok: false, error: body.error as string };
  }
  const user = coerceRouteUser(body.user);
  if (!user) {
    return { ok: false, error: "Verification did not complete — please try again." };
  }
  return {
    ok: true,
    user,
    isNewUser: body.isNewUser === true,
  };
}
