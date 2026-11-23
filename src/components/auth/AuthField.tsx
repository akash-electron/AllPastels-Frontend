"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AuthField — the input treatment used by both auth forms.
 *
 * Card-style field (rather than the underline style used on the contact
 * form) so the auth screens read as their own surface. The frame warms from
 * `surface` to `floral` on focus and turns peach on error, with the message
 * announced through `role="alert"` like every other form on the site.
 */

interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  /** Slot inside the field, on the right — e.g. a show/hide toggle. */
  trailing?: ReactNode;
}

export function AuthField({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  error,
  maxLength,
  trailing,
}: AuthFieldProps) {
  return (
    <div className="group/field">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="ap-eyebrow text-ink/50 transition-colors duration-300 group-focus-within/field:text-burnt">
          {label}
        </label>
        {/* Hairline that draws itself in on focus */}
        <span
          aria-hidden="true"
          className="h-px w-0 bg-burnt/60 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/field:w-8"
        />
      </div>
      <div
        className={cn(
          "relative border bg-surface transition-all duration-300",
          error
            ? "border-burnt bg-burnt-900/50"
            : "border-line hover:border-ash-400 focus-within:border-burnt focus-within:bg-floral",
        )}
      >
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "w-full bg-transparent px-4 py-4 text-sm text-ink outline-none placeholder:text-ink/30",
            trailing ? "pr-20" : "",
          )}
        />
        {trailing && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="ap-body mt-1.5 text-xs text-burnt-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** Small text button that sits inside a field (show/hide password). */
export function FieldAction({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ap-eyebrow px-2.5 py-2 transition-colors",
        active ? "text-burnt" : "text-ink/40 hover:text-ink/70",
      )}
    >
      {children}
    </button>
  );
}
