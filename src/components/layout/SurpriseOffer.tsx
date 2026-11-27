"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveCoupons } from "@/api";
import { Button } from "@/components/ui/Button";
import { CheckIcon, CloseIcon, GiftIcon } from "@/components/ui/icons";
import { SURPRISE_OFFER } from "@/data/site";
import { formatPrice } from "@/lib/utils";
import type { PublicCoupon } from "@/types/coupon";

/**
 * SurpriseOffer — the first-visit welcome offer.
 *
 * Two parts: a small pastel bubble that is always available, and a soft card
 * that opens once on a first visit and stays until dismissed. Coupon codes are
 * fetched from the admin-managed backend feed, so only currently usable offers
 * (active, unexpired and not exhausted) ever appear. Checkout still validates
 * the chosen code server-side, and the reveal/copy/dismissal interactions stay
 * local, exactly like the newsletter form.
 *
 * Dismissal is remembered in localStorage, so a returning visitor is never
 * nagged. The bubble hides during checkout so nothing competes with paying.
 */

const STORAGE_KEY = "allpastels.surprise-offer.v1";
const OPEN_DELAY = 3200;

type CouponsStatus = "loading" | "ready" | "error";

function discountLabel(coupon: PublicCoupon): string {
  return coupon.type === "percent"
    ? `${coupon.value}% off`
    : `${formatPrice(coupon.value)} off`;
}

export function SurpriseOffer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [status, setStatus] = useState<CouponsStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const remember = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "seen");
    } catch {
      /* storage unavailable — the offer simply appears again next visit */
    }
  }, []);

  // Load the live offers once on mount (and again on retry). A stale response
  // is discarded so a slow retry cannot overwrite newer data.
  useEffect(() => {
    let active = true;

    getActiveCoupons().then((result) => {
      if (!active) return;
      if (result.ok) {
        setCoupons(result.coupons);
        setStatus("ready");
        return;
      }
      setCoupons([]);
      setError(result.error);
      setStatus("error");
    });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Auto-open exactly once per visitor, and only when there is something to
  // unwrap. An empty or failed feed never interrupts the first visit.
  useEffect(() => {
    if (status !== "ready" || coupons.length === 0) return;

    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "seen";
    } catch {
      seen = false;
    }
    if (seen) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
      remember();
    }, OPEN_DELAY);

    return () => window.clearTimeout(timer);
  }, [status, coupons.length, remember]);

  // Lock the page behind the card and wire up Escape while it is open.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => {
        setCopiedCode((current) => (current === code ? null : current));
      }, 2200);
    } catch {
      /* Clipboard blocked — the code is still on screen to type by hand. */
    }
  }, []);

  const retry = useCallback(() => {
    setRevealed(false);
    setError(null);
    setStatus("loading");
    setReloadKey((current) => current + 1);
  }, []);

  // Nothing should compete with paying.
  if (pathname?.startsWith("/checkout")) return null;

  return (
    <>
      {/* Persistent trigger. Sits bottom-right — clear of the hero CTAs and of
          the framework's own dev badge in the opposite corner — and reduces to
          a tidy icon button on small screens. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ap-anim-rise group fixed bottom-5 right-5 z-[55] inline-flex items-center gap-2.5 rounded-full bg-burnt p-2 text-floral-900 shadow-lg ring-1 ring-floral-900/10 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt-300 sm:pr-4"
        style={{ animationDelay: "1600ms" }}
        aria-label="Open the surprise welcome offer"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-floral text-burnt transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-6">
          <GiftIcon className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <span className="hidden text-xs font-medium sm:inline">Surprise offer</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="surprise-title"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full animate-[ap-fade_300ms_ease-out] bg-ash-100/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close offer"
            tabIndex={-1}
          />

          <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
            <div className="ap-anim-rise pointer-events-auto relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-cotton-800 via-floral to-powder-800 p-7 shadow-2xl sm:p-9">
              {/* Soft decorative dots */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cotton-700/50"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-powder-800/50"
              />

              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-ink/60 transition-colors duration-300 hover:bg-floral/70 hover:text-ink"
                aria-label="Close offer"
              >
                <CloseIcon className="h-5 w-5" />
              </button>

              <div className="relative">
                <p className="ap-eyebrow text-burnt">A little surprise</p>

                <h2
                  id="surprise-title"
                  className="mt-3 text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.02] tracking-[-0.02em] text-ink"
                >
                  {SURPRISE_OFFER.headline}
                </h2>

                <p className="ap-body mt-3 max-w-sm text-ink/70">
                  {SURPRISE_OFFER.description}
                </p>

                {status === "loading" && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="ap-body mt-7 rounded-2xl border border-dashed border-ink/20 bg-floral/70 px-5 py-5 text-sm text-ink/60"
                  >
                    Fetching today&apos;s offers&hellip;
                  </p>
                )}

                {status === "error" && (
                  <div className="mt-7 rounded-2xl border border-dashed border-burnt/40 bg-floral/80 px-5 py-5">
                    <p className="ap-body text-sm text-ink/70">
                      {error ?? "We could not load today's offers."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={retry}
                    >
                      Try again
                    </Button>
                  </div>
                )}

                {status === "ready" && coupons.length === 0 && (
                  <p className="ap-body mt-7 rounded-2xl border border-dashed border-ink/20 bg-floral/70 px-5 py-5 text-sm text-ink/60">
                    No offers are running right now. Check back soon for a little
                    treat.
                  </p>
                )}

                {status === "ready" &&
                  coupons.length > 0 &&
                  (revealed ? (
                    <div className="mt-7">
                      <ul className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                        {coupons.map((coupon) => (
                          <li
                            key={coupon.code}
                            className="rounded-2xl border border-dashed border-ink/30 bg-floral/80 px-4 py-3.5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate font-display text-lg tracking-[0.14em] text-ink sm:text-xl">
                                {coupon.code}
                              </span>

                              <button
                                type="button"
                                onClick={() => copyCode(coupon.code)}
                                className="ap-eyebrow inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-floral transition-colors duration-500 hover:bg-burnt hover:text-floral-900"
                                aria-label={`Copy code ${coupon.code}`}
                              >
                                {copiedCode === coupon.code ? (
                                  <>
                                    <CheckIcon className="h-3.5 w-3.5" />
                                    Copied
                                  </>
                                ) : (
                                  "Copy code"
                                )}
                              </button>
                            </div>

                            <p className="ap-body mt-2 text-xs leading-relaxed text-ink/60">
                              <span className="text-burnt">{discountLabel(coupon)}</span>
                              {coupon.minOrderAmount > 0
                                ? ` · on orders over ${formatPrice(coupon.minOrderAmount)}`
                                : ""}
                              {coupon.maxDiscountAmount !== null
                                ? ` · up to ${formatPrice(coupon.maxDiscountAmount)}`
                                : ""}
                            </p>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-5">
                        <Button
                          href="/new-arrivals"
                          variant="primary"
                          size="md"
                          withArrow
                          className="w-full"
                        >
                          Shop new in
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="group mt-7 flex w-full items-center gap-4 rounded-2xl bg-floral/85 px-5 py-4 text-left ring-1 ring-floral transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-floral hover:shadow-lg"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-burnt text-floral-900 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-6">
                        <GiftIcon className="h-6 w-6" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-ink">Tap to unwrap</span>
                        <span className="ap-eyebrow text-ink/45">
                          {coupons.length === 1
                            ? "Your code is inside"
                            : `${coupons.length} offers inside`}
                        </span>
                      </span>
                    </button>
                  ))}

                <p className="ap-body mt-6 text-[0.6875rem] leading-relaxed text-ink/50">
                  {SURPRISE_OFFER.note}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
