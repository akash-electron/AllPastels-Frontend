"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthField, FieldAction } from "@/components/auth/AuthField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PhoneOtpForm } from "@/components/auth/PhoneOtpForm";
import { StrengthMeter } from "@/components/auth/StrengthMeter";
import { Button } from "@/components/ui/Button";
import { isValidEmail, passwordStrength } from "@/lib/auth";
import { registerCustomer, resendVerification } from "@/api";

/**
 * SignUpForm — registers the customer with the real backend.
 *
 * Validation runs locally first; backend errors (duplicate email, missing
 * fields) surface through `role="alert"`. Registration never signs the
 * visitor in — the backend verifies the email first — so success swaps to a
 * panel that mirrors the backend's `emailSent` flag: when it is false the
 * copy states plainly that no verification email went out, and both cases
 * offer a resend (sending / sent / error states).
 */

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  terms?: string;
}

type ResendState = "idle" | "sending" | "sent" | "error";

export function SignUpForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  // Registration success — kept so the panel can mirror `emailSent` and
  // offer a resend for exactly this address.
  const [registered, setRegistered] = useState<{
    email: string;
    emailSent: boolean;
  } | null>(null);
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [resendError, setResendError] = useState<string | undefined>();

  const clearError = (key: keyof FieldErrors) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const found: FieldErrors = {};
    if (name.trim().length < 2) found.name = "Please tell us your name";
    if (!isValidEmail(email)) found.email = "Please enter a valid email address";
    if (passwordStrength(password) < 2) {
      found.password = "Choose something longer — 8 characters or more";
    }
    if (!agreed) found.terms = "Please accept the terms to continue";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    setErrors({});

    const result = await registerCustomer({ name, email, password });

    setPending(false);

    if (!result.ok) {
      setErrors({ email: result.error });
      return;
    }
    // The account exists but is unverified — the backend decides what was
    // emailed via `emailSent`, and we keep the address for the resend.
    setRegistered({ email, emailSent: result.emailSent });
  };

  const requestResend = async () => {
    if (!registered || resendState === "sending") return;
    setResendState("sending");
    setResendError(undefined);
    const result = await resendVerification(registered.email);
    if (result.ok) {
      setResendState("sent");
    } else {
      setResendState("error");
      setResendError(result.error);
    }
  };

  if (registered) {
    return (
      <div className="ap-anim-rise">
        <p className="ap-eyebrow flex items-center gap-3 text-burnt">
          <span aria-hidden="true" className="h-px w-6 bg-burnt/50" />
          Account created
        </p>
        <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.1rem)]">
          One step to <em className="font-light italic text-burnt">go</em>.
        </h2>
        <p className="ap-body mt-4 text-ink/65" role="status">
          {registered.emailSent
            ? "A verification email is on its way to "
            : "No verification email was sent — "}
          <span className="text-ink">{registered.email.trim()}</span>
          {registered.emailSent
            ? " — open the newest one (check spam if it's hiding) to confirm your address before signing in."
            : ": the boutique's email delivery is switched off, so the account is waiting on a resend."}
        </p>

        {/*
          The backend decides what gets emailed via `emailSent`; the resend
          is the only path forward when that flag came back false.
        */}
        <div className="mt-6 border-l-2 border-burnt bg-burnt-900/50 px-4 py-4">
          <p className="ap-eyebrow text-ink/50">
            {registered.emailSent ? "Email sent" : "Verification pending"}
          </p>
          {registered.emailSent ? (
            resendState !== "sent" ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                className="mt-3 w-full"
                onClick={requestResend}
                disabled={resendState === "sending"}
              >
                {resendState === "sending" ? "Sending…" : "Resend verification email"}
              </Button>
            ) : (
              <p className="ap-body mt-3 text-xs text-ink/65">
                A new verification email is heading to{" "}
                <span className="text-ink">{registered.email.trim()}</span> — open
                the newest one on its way.
              </p>
            )
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="mt-3 w-full"
              onClick={requestResend}
              disabled={resendState === "sending"}
            >
              {resendState === "sending" ? "Sending…" : "Resend verification email"}
            </Button>
          )}
          {resendState === "error" && resendError && (
            <p role="alert" className="ap-body mt-2 text-xs text-burnt-400">
              {resendError}
            </p>
          )}
        </div>

        <p className="ap-body mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-line pt-6 text-center text-sm text-ink/60">
          Already verified?{" "}
          <Link
            href="/login"
            className="ap-eyebrow text-burnt transition-colors duration-300 hover:text-burnt-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

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
      <div className="grid gap-5">
        <AuthField
          id="signup-name"
          label="Your name"
          value={name}
          onChange={(value) => {
            setName(value);
            clearError("name");
          }}
          error={errors.name}
          autoComplete="name"
          placeholder="Aarav Patel"
        />
        <AuthField
          id="signup-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            clearError("email");
          }}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <div>
          <AuthField
            id="signup-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(value) => {
              setPassword(value);
              clearError("password");
            }}
            error={errors.password}
            autoComplete="new-password"
            placeholder="••••••••"
            trailing={
              <FieldAction active={showPassword} onClick={() => setShowPassword((on) => !on)}>
                {showPassword ? "Hide" : "Show"}
              </FieldAction>
            }
          />
          <StrengthMeter value={password} />
        </div>
      </div>

      <div className="mt-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => {
              setAgreed(event.target.checked);
              clearError("terms");
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-burnt"
            aria-describedby={errors.terms ? "signup-terms-error" : undefined}
          />
          <span className="ap-body text-xs text-ink/60">
            I agree to the{" "}
            <Link href="/faq#terms" className="text-burnt underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/faq#privacy" className="text-burnt underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && (
          <p
            id="signup-terms-error"
            role="alert"
            className="ap-body mt-1.5 text-xs text-burnt-400"
          >
            {errors.terms}
          </p>
        )}
      </div>

      <Button type="submit" variant="primary" size="lg" className="mt-7 w-full" withArrow disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </Button>

      <p className="ap-body mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-line pt-6 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="ap-eyebrow text-burnt transition-colors duration-300 hover:text-burnt-400"
        >
          Sign in
        </Link>
      </p>
      </form>
      )}
    </div>
  );
}
