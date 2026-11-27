import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { resendVerification, updateProfile } from "@/api";
import { AccountCard, AccountPanel } from "@/components/account/AccountPanel";
import { useAuth } from "@/components/store/AuthProvider";
import type { Session } from "@/components/store/AuthProvider";
import { Button } from "@/components/ui/Button";
import { CheckIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Profile — the customer's own name, email and phone, backed by
 * `PUT /api/auth/profile`.
 *
 * A changed email is re-verified by the backend through the same single-use
 * email flow as registration, so the panel reports that state instead of
 * pretending the new address is immediately usable for sign-in.
 */

interface AccountProfileProps {
  session: Session;
  joined: string;
}

type ProfileValues = {
  name: string;
  email: string;
  phone: string;
};

function validateProfile(
  values: ProfileValues,
): Partial<Record<keyof ProfileValues, string>> {
  const errors: Partial<Record<keyof ProfileValues, string>> = {};
  if (values.name.trim().length < 2 || values.name.trim().length > 100) {
    errors.name = "Name must be between 2 and 100 characters";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = "Please enter a valid email address";
  }
  if (values.phone.trim() && !/^[+]?[0-9()\- ]{6,20}$/.test(values.phone.trim())) {
    errors.phone = "Please enter a valid phone number";
  }
  return errors;
}

function ProfileField({
  label,
  value,
  error,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  const id = `profile-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${id}-error`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="ap-eyebrow mb-2 block text-ink/55">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "w-full border bg-floral px-3.5 py-3 text-sm text-ink outline-none transition-colors",
          error
            ? "border-burnt"
            : "border-line hover:border-ash-400 focus:border-burnt",
        )}
      />
      {error && (
        <p id={errorId} role="alert" className="ap-body mt-1.5 text-xs text-burnt-400">
          {error}
        </p>
      )}
    </div>
  );
}

function ProfileGroupHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: (props: { className?: string }) => ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-floral text-ash-300">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="ap-eyebrow text-ink">{title}</p>
        <p className="mt-1 truncate text-xs text-ink/50">{hint}</p>
      </div>
    </div>
  );
}

type ResendState = "idle" | "sending" | "sent" | "error";

export function AccountProfile({ session, joined }: AccountProfileProps) {
  const { updateSession, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileValues>({
    name: session.name,
    email: session.email ?? "",
    phone: session.phone ?? "",
  });
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileValues, string>>
  >({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [emailVerificationPending, setEmailVerificationPending] = useState(
    session.isEmailVerified === false,
  );
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  const updateProfileField = (name: keyof ProfileValues, value: string) => {
    setProfile((current) => ({ ...current, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileSaving) return;

    const found = validateProfile(profile);
    setProfileErrors(found);
    if (Object.keys(found).length > 0) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileNotice(null);
    const result = await updateProfile({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
    });
    setProfileSaving(false);

    if (!result.ok) {
      if (result.unauthorized) {
        signOut();
        return;
      }
      setProfileError(result.error);
      return;
    }

    updateSession(result.user);
    setProfile({
      name: result.user.name,
      email: result.user.email ?? "",
      phone: result.user.phone ?? "",
    });
    setEmailVerificationPending(
      result.emailVerificationRequired || !result.user.isEmailVerified,
    );
    setResendState("idle");
    setResendError(null);
    setProfileNotice(result.message);
  };

  const handleResendVerification = async () => {
    if (resendState === "sending") return;
    if (!session.email) {
      setResendState("error");
      setResendError("Add an email address to your profile before verifying it.");
      return;
    }
    setResendState("sending");
    setResendError(null);
    const result = await resendVerification(session.email);
    if (result.ok) {
      setResendState("sent");
    } else {
      setResendState("error");
      setResendError(result.error);
    }
  };

  return (
    <AccountPanel
      id="account-profile"
      eyebrow="Profile"
      title="Your profile details"
    >
      <AccountCard
        header={
          <ProfileGroupHeader
            icon={UserIcon}
            title="Profile details"
            hint="How your account reads across the store"
          />
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="ap-eyebrow text-ink/40">Member since {joined}</p>
            <Button
              type="submit"
              form="profile-form"
              variant="primary"
              size="sm"
              disabled={profileSaving}
              aria-busy={profileSaving}
            >
              {profileSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      >
        <form id="profile-form" onSubmit={handleProfileSubmit} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <ProfileField
              label="Full name"
              value={profile.name}
              error={profileErrors.name}
              autoComplete="name"
              onChange={(value) => updateProfileField("name", value)}
            />
            <ProfileField
              label="Phone number"
              value={profile.phone}
              error={profileErrors.phone}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={20}
              onChange={(value) => updateProfileField("phone", value)}
            />
            <ProfileField
              label="Email address"
              value={profile.email}
              error={profileErrors.email}
              type="email"
              autoComplete="email"
              inputMode="email"
              onChange={(value) => updateProfileField("email", value)}
            />
            <div className="min-w-0">
              <p className="ap-eyebrow mb-2 text-ink/55">Account status</p>
              <div className="flex min-h-[46px] items-center gap-2 border border-line bg-surface/60 px-3.5 text-sm text-ink/65">
                <CheckIcon className="h-4 w-4 text-burnt" />
                {emailVerificationPending
                  ? "Verify your new email address"
                  : "Email verified"}
              </div>
            </div>
          </div>

          <p className="ap-body mt-4 text-xs text-ink/45">
            Changing your email address sends a verification link to the new
            address before it can be used to sign in.
          </p>

          {emailVerificationPending && (
            <div className="mt-4 border border-line bg-surface/60 px-4 py-3">
              <p className="ap-body text-sm text-ink/70">
                {resendState === "sent"
                  ? `A new verification email is on its way to ${session.email}.`
                  : "Your email address is not verified yet. Resend the verification link if it went missing."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleResendVerification}
                disabled={resendState === "sending"}
              >
                {resendState === "sending"
                  ? "Sending…"
                  : resendState === "sent"
                    ? "Resend again"
                    : "Resend verification email"}
              </Button>
              {resendState === "error" && resendError && (
                <p role="alert" className="ap-body mt-2 text-xs text-burnt-400">
                  {resendError}
                </p>
              )}
            </div>
          )}

          {profileNotice && (
            <p
              role="status"
              className="ap-body mt-4 border border-line bg-surface/60 px-4 py-3 text-sm text-ink/70"
            >
              {profileNotice}
            </p>
          )}
          {profileError && (
            <p
              role="alert"
              className="ap-body mt-4 border border-burnt/40 bg-burnt-900 px-4 py-3 text-sm text-burnt-200"
            >
              {profileError}
            </p>
          )}
        </form>
      </AccountCard>
    </AccountPanel>
  );
}
