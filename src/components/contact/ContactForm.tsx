"use client";

import { useState, type FormEvent } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { sendContactMessage } from "@/api";

/**
 * ContactForm — letter on floral paper, only the 5 pastel tokens.
 * No black: ink replaced with burnt-100 cocoa, actions in burnt peach.
 */

interface FormValues {
  name: string;
  email: string;
  orderNumber: string;
  topic: string;
  message: string;
}

const EMPTY: FormValues = {
  name: "",
  email: "",
  orderNumber: "",
  topic: "Sizing & fit",
  message: "",
};

const TOPICS: { label: string; swatch: string }[] = [
  { label: "Sizing & fit", swatch: "#c5d1b3" },
  { label: "An existing order", swatch: "#ffa32a" },
  { label: "Returns & exchanges", swatch: "#ffc5c2" },
  { label: "Gifting", swatch: "#f3a39a" },
  { label: "Wholesale", swatch: "#dc7954" },
  { label: "Something else", swatch: "#ffcd8d" },
];

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.name.trim()) errors.name = "Please tell us your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    errors.email = "Please enter a valid email address";
  }
  if (values.message.trim().length < 10) {
    errors.message = "Add a little more detail so we can help";
  }
  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");

  const update = (name: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    try {
      const result = await sendContactMessage({ ...values, website });
      if (result.ok) {
        setSent(true);
      } else if (result.fieldErrors) {
        const fieldErrors = result.fieldErrors;
        // Order number and topic have no inline error slot, so always show
        // the general message too — the shopper is never left guessing.
        setFormError(
          fieldErrors.orderNumber
            ? `${result.error} ${fieldErrors.orderNumber}`
            : result.error,
        );
        setErrors((current) => {
          const next = { ...current };
          for (const [key, message] of Object.entries(fieldErrors)) {
            if (key in values && typeof message === "string") {
              next[key as keyof FormValues] = message;
            }
          }
          return next;
        });
      } else {
        setFormError(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-[16px] bg-ash p-8 sm:p-12">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-burnt text-floral">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="font-display mt-6 text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.05] text-burnt-100">
          Noted, {values.name.split(" ")[0] || "friend"}. We’ll write back soon.
        </h2>
        <p className="mt-4 max-w-[46ch] text-[0.95rem] leading-relaxed text-burnt-100/70">
          Your note about {values.topic.toLowerCase()} is with the studio. Expect
          a reply at {values.email} within one working day.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setValues(EMPTY);
          }}
          className="mt-8 rounded-full border border-burnt-100/25 px-7 py-3 text-[0.85rem] font-medium text-burnt-100 transition-colors duration-300 hover:bg-burnt hover:text-floral"
        >
          Write another note
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative overflow-hidden rounded-[16px] border border-burnt-100/15 bg-floral-900 p-6 sm:p-10"
    >
      {/* pastel selvedge — the fabric cue, theme colours only */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[6px] opacity-90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #c5d1b3 0 18px, #ffc5c2 18px 36px, #f3a39a 36px 54px, #dc7954 54px 72px)",
        }}
      />

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <h2 className="font-display text-[clamp(1.6rem,2.6vw,2.1rem)] leading-none text-burnt-100">
          Your note
        </h2>
        <p className="text-[0.82rem] text-burnt-100/50">Takes about a minute</p>
      </div>

      <fieldset className="mt-6">
        <legend className="text-[0.85rem] font-medium text-burnt-100/70">
          What is it about?
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map((topic) => {
            const active = values.topic === topic.label;
            return (
              <button
                key={topic.label}
                type="button"
                onClick={() => update("topic", topic.label)}
                aria-pressed={active}
                className={
                  active
                    ? "flex items-center gap-2 rounded-full bg-burnt py-2 pl-2.5 pr-4 text-[0.83rem] font-medium text-floral transition-colors duration-300"
                    : "flex items-center gap-2 rounded-full border border-burnt-100/20 bg-transparent py-2 pl-2.5 pr-4 text-[0.83rem] text-burnt-100/75 transition-colors duration-300 hover:border-burnt hover:text-burnt-100"
                }
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-burnt-100/15"
                  style={{ backgroundColor: topic.swatch }}
                />
                {topic.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-7 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="text-[0.85rem] font-medium text-burnt-100/70"
          >
            Your name
          </label>
          <input
            id="contact-name"
            type="text"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            autoComplete="name"
            placeholder="Asha Patel"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            className="mt-1 w-full border-b border-burnt-100/20 bg-transparent py-3 text-[0.95rem] text-burnt-100 outline-none transition-colors placeholder:text-burnt-100/30 focus:border-burnt"
          />
          {errors.name && (
            <p id="contact-name-error" role="alert" className="mt-1.5 text-[0.8rem] text-burnt-400">
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="text-[0.85rem] font-medium text-burnt-100/70"
          >
            Email where we reply
          </label>
          <input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            className="mt-1 w-full border-b border-burnt-100/20 bg-transparent py-3 text-[0.95rem] text-burnt-100 outline-none transition-colors placeholder:text-burnt-100/30 focus:border-burnt"
          />
          {errors.email && (
            <p id="contact-email-error" role="alert" className="mt-1.5 text-[0.8rem] text-burnt-400">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="mt-7">
        <label
          htmlFor="contact-order"
          className="text-[0.85rem] font-medium text-burnt-100/70"
        >
          Order number <span className="font-normal text-burnt-100/45">(if you have one)</span>
        </label>
        <input
          id="contact-order"
          type="text"
          value={values.orderNumber}
          onChange={(e) => update("orderNumber", e.target.value)}
          placeholder="AP-02481"
          className="mt-1 w-full border-b border-burnt-100/20 bg-transparent py-3 text-[0.95rem] text-burnt-100 outline-none transition-colors placeholder:text-burnt-100/30 focus:border-burnt sm:max-w-[240px]"
        />
      </div>

      <div className="mt-7">
        <div className="flex items-baseline justify-between gap-4">
          <label
            htmlFor="contact-message"
            className="text-[0.85rem] font-medium text-burnt-100/70"
          >
            Your message
          </label>
          <span className="text-[0.78rem] text-burnt-100/40">
            {values.message.trim().length < 10
              ? "A sentence or two helps"
              : `${values.message.trim().length} characters`}
          </span>
        </div>
        <textarea
          id="contact-message"
          rows={5}
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="Hi — I’m between sizes M and L in linen, usually M on top. What would you suggest for the wrap dress?"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          className="mt-2 w-full rounded-[12px] border border-burnt-100/20 bg-floral p-4 text-[0.95rem] leading-relaxed text-burnt-100 outline-none transition-colors placeholder:text-burnt-100/30 focus:border-burnt"
        />
        {errors.message && (
          <p id="contact-message-error" role="alert" className="mt-1.5 text-[0.8rem] text-burnt-400">
            {errors.message}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="mt-6 text-[0.8rem] text-burnt-400">
          {formError}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-burnt px-10 py-4 text-[0.9rem] font-medium text-floral transition-colors duration-300 hover:bg-burnt-400 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
        <p className="text-[0.82rem] leading-relaxed text-burnt-100/50">
          No newsletters, no sharing. Just a reply.
        </p>
      </div>
    </form>
  );
}
