"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField, FieldAction } from "@/components/auth/AuthField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PhoneOtpForm } from "@/components/auth/PhoneOtpForm";
import { useAuth } from "@/components/store/AuthProvider";
import { Button } from "@/components/ui/Button";
import { isValidEmail } from "@/lib/auth";
import { resendVerification } from "@/api";

/**
 * SignInForm — signs in against the real backend through the AuthProvider.
 *
 * Validation runs before the provider call; backend errors (invalid
 * credentials, expired session state) surface through `role="alert"`. A 403
 * "email verification required" gets its own panel that can resend the
 * verification email for the address just typed, with sending/sent/error
 * states. A successful sign-in routes to /account and an existing session
 * is bounced there on mount.
 */

interface FieldErrors {
  email?: string;
  password?: string;
  form?: string;
}

/* Per-attempt state of the resend-verification panel. */
type ResendState = "idle" | "sending" | "sent" | "error";

export function SignInForm() {
  const router = useRouter();
  const { signIn, session, hydrated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [resendError, setResendError] = useState<string | undefined>();

  // Already signed in — skip straight to the dashboard. Waits for the
  // session restore to finish so a stale profile never bounces anyone who
  // has actually been signed out server-side.
  useEffect(() => {
    if (hydrated && session) router.replace("/account");
  }, [hydrated, session, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const found: FieldErrors = {};
    if (!isValidEmail(email)) found.email = "Please enter a valid email address";
    if (password.length < 6) found.password = "Passwords are at least 6 characters";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    setErrors({});

    const result = await signIn({ email, password });

    setPending(false);

    if (!result.ok) {
      setErrors({ form: result.error });
      // An unverified account answers with 403 — surface the resend option
      // for exactly the address that just failed to sign in. Once shown the
      // panel stays, so a follow-up failure never hides it mid-flow.
      if (result.verificationRequired) {
        setVerificationRequired(true);
        setResendState("idle");
        setResendError(undefined);
      }
      return;
    }
    router.push("/account");
  };

  const requestResend = async () => {
    if (resendState === "sending") return;
    setResendState("sending");
    setResendError(undefined);
    const result = await resendVerification(email);
    if (result.ok) {
      setResendState("sent");
    } else {
      setResendState("error");
      setResendError(result.error);
    }
  };

  return (
    <div>
      <GoogleButton onSuccess={() => router.push("/account")} />

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="ap-eyebrow text-ink/40">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("email")}
          className={
            tab === "email"
              ? "ap-eyebrow border border-burnt bg-burnt px-4 py-2 text-floral"
              : "ap-eyebrow border border-line px-4 py-2 text-ink/60 transition-colors hover:text-ink"
          }
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setTab("phone")}
          className={
            tab === "phone"
              ? "ap-eyebrow border border-burnt bg-burnt px-4 py-2 text-floral"
              : "ap-eyebrow border border-line px-4 py-2 text-ink/60 transition-colors hover:text-ink"
          }
        >
          Phone
        </button>
      </div>

      {tab === "phone" ? (
        <PhoneOtpForm onSuccess={() => router.push("/account")} />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {errors.form && (
        <p
          role="alert"
          className="ap-body mb-5 border border-burnt/40 bg-burnt-900 px-4 py-3 text-sm text-burnt-200"
        >
          {errors.form}
        </p>
      )}

      <div className="grid gap-5">
        <AuthField
          id="login-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            if (errors.email || errors.form) setErrors({});
          }}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <AuthField
          id="login-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (errors.password || errors.form) setErrors({});
          }}
          error={errors.password}
          autoComplete="current-password"
          placeholder="••••••••"
          trailing={
            <FieldAction active={showPassword} onClick={() => setShowPassword((on) => !on)}>
              {showPassword ? "Hide" : "Show"}
            </FieldAction>
          }
        />
      </div>

      <div className="mt-4 text-right">
        <Link
          href="/forgot-password"
          className="ap-eyebrow text-ink/45 transition-colors hover:text-burnt"
        >
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" variant="primary" size="lg" className="mt-7 w-full" withArrow disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      {verificationRequired && resendState !== "sent" && (
        <div className="mt-5 border-l-2 border-burnt bg-burnt-900/50 px-4 py-4">
          <p className="ap-eyebrow text-ink/50">Waiting on verification</p>
          <p className="ap-body mt-2 text-xs text-ink/65">
            Didn&apos;t get the email, or it went stale? Resend the
            verification link to{" "}
            <span className="text-ink">{email.trim()}</span>.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={requestResend}
            disabled={resendState === "sending"}
          >
            {resendState === "sending" ? "Sending…" : "Resend verification email"}
          </Button>
          {resendState === "error" && resendError && (
            <p role="alert" className="ap-body mt-2 text-xs text-burnt-400">
              {resendError}
            </p>
          )}
        </div>
      )}

      {verificationRequired && resendState === "sent" && (
        <div
          role="status"
          className="ap-body mt-5 border-l-2 border-burnt bg-burnt-900/50 px-4 py-4 text-xs text-ink/65"
        >
          A new verification email is on its way to{" "}
          <span className="text-ink">{email.trim()}</span> — open the newest
          one (check spam if it&apos;s hiding) to confirm your address, then
          sign in again.
        </div>
      )}

      <p className="ap-body mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-line pt-6 text-center text-sm text-ink/60">
        New to AllPastels?{" "}
        <Link
          href="/signup"
          className="ap-eyebrow text-burnt transition-colors duration-300 hover:text-burnt-400"
        >
          Create an account
        </Link>
      </p>
        </form>
      )}
    </div>
  );
}
