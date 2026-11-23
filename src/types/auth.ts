/**
 * Shared auth domain types.
 *
 * Single source of truth for the shapes the auth flow passes between the
 * services in `src/api/auth/`, the providers and the forms. Deliberately a
 * "safe subset" — the profile the UI is allowed to see; the backend JWT never
 * appears in any of these types because client code must never touch it.
 */

/** Safe subset of the backend user record that the UI is allowed to see. */
export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
}

export type GoogleSignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

export type RequestOtpResult =
  | { ok: true; message: string; expiresIn: number; resendIn: number }
  | { ok: false; error: string; retryAfter?: number };

export type VerifyOtpResult =
  | { ok: true; user: AuthUser; isNewUser: boolean }
  | { ok: false; error: string; nameRequired?: boolean };

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "server" | "network" };

export type RegisterResult =
  | { ok: true; emailSent: boolean; message: string }
  | { ok: false; error: string };

export type SignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; verificationRequired?: boolean };

export type SessionRestoreResult =
  | { ok: true; user: AuthUser }
  | { ok: false };

export type ResendVerificationResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export type ForgotPasswordResult =
  | { ok: true; message: string; emailSent: boolean }
  | { ok: false; error: string };

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };
