"use client";

import { useEffect, useState } from "react";
import { AuthField } from "@/components/auth/AuthField";
import { useAuth } from "@/components/store/AuthProvider";
import { Button } from "@/components/ui/Button";
import { requestOtp } from "@/api";
import type { AuthUser } from "@/types/auth";

interface PhoneOtpFormProps {
  onSuccess: (user: AuthUser, isNewUser: boolean) => void;
}

export function PhoneOtpForm({ onSuccess }: PhoneOtpFormProps) {
  const { verifyOtp } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameRequired, setNameRequired] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSend = async () => {
    if (pending || !phone.trim()) return;
    setPending(true);
    setError(null);
    const result = await requestOtp(phone);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      if (result.retryAfter) setCountdown(result.retryAfter);
      return;
    }
    setStep(2);
    setCode("");
    setName("");
    setNameRequired(false);
    setCountdown(result.resendIn);
  };

  const handleResend = async () => {
    if (pending || countdown > 0) return;
    setPending(true);
    setError(null);
    const result = await requestOtp(phone);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      if (result.retryAfter) setCountdown(result.retryAfter);
      return;
    }
    setCountdown(result.resendIn);
  };

  const handleVerify = async () => {
    if (pending) return;
    if (code.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (nameRequired && name.trim().length < 2) {
      setError("Please tell us your name.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await verifyOtp({
      phone,
      code,
      ...(nameRequired ? { name } : {}),
    });
    setPending(false);
    if (!result.ok) {
      if (result.nameRequired) {
        setNameRequired(true);
        setError(null);
      } else {
        setError(result.error);
      }
      return;
    }
    onSuccess(result.user, result.isNewUser);
  };

  if (step === 1) {
    return (
      <div className="grid gap-5">
        {error && (
          <p
            role="alert"
            className="ap-body mb-5 border border-burnt/40 bg-burnt-900 px-4 py-3 text-sm text-burnt-200"
          >
            {error}
          </p>
        )}
        <AuthField
          id="otp-phone"
          label="Mobile number (WhatsApp)"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(value) => {
            setPhone(value);
            if (error) setError(null);
          }}
          placeholder="98765 43210"
        />
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          withArrow
          disabled={pending || !phone.trim()}
          onClick={() => void handleSend()}
        >
          {pending ? "Sending…" : "Send code"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {error && (
        <p
          role="alert"
          className="ap-body mb-5 border border-burnt/40 bg-burnt-900 px-4 py-3 text-sm text-burnt-200"
        >
          {error}
        </p>
      )}
      <AuthField
        id="otp-code"
        label="Verification code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(value) => {
          setCode(value);
          if (error) setError(null);
        }}
        placeholder="123456"
      />
      {nameRequired && (
        <AuthField
          id="otp-name"
          label="Your name"
          value={name}
          onChange={(value) => {
            setName(value);
            if (error) setError(null);
          }}
          placeholder="Aarav Patel"
        />
      )}
      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        withArrow
        disabled={pending}
        onClick={() => void handleVerify()}
      >
        {pending ? "Verifying…" : "Verify"}
      </Button>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={pending || countdown > 0}
          className="ap-eyebrow text-burnt transition-colors duration-300 hover:text-burnt-400 disabled:text-ink/40"
        >
          {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setCode("");
            setName("");
            setNameRequired(false);
            setError(null);
            setCountdown(0);
          }}
          className="ap-eyebrow text-ink/45 transition-colors hover:text-burnt"
        >
          Change number
        </button>
      </div>
    </div>
  );
}