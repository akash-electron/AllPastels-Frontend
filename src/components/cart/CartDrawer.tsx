"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCartDrawer } from "@/components/store/CartDrawerProvider";
import { useStore } from "@/components/store/StoreProvider";
import { Button } from "@/components/ui/Button";
import { BagIcon, CloseIcon, TruckIcon } from "@/components/ui/icons";
import { quoteShipping, quoteTax } from "@/lib/checkout-settings";
import { productImageUrl } from "@/lib/images";
import { cartStockIssue, formatPrice, pluralize } from "@/lib/utils";

/**
 * CartDrawer — the bag as a panel rather than a page.
 *
 * Opens from the navbar bag icon and reads the *same* store as the bag page,
 * the quick-add buttons and checkout: there is no second copy of the cart
 * anywhere. Every action the shopper takes here (quantity, remove) is the
 * identical store call the bag page makes, so the two surfaces can never
 * disagree — and the bag page keeps working untouched.
 *
 * Geometry is handled by `.ap-drawer-panel` in globals.css: a bottom sheet on
 * phones, a right-hand drawer from the small breakpoint up, sharing one DOM.
 *
 * Dismissal covers all three expectations: the close button, a click on the
 * scrim, and Escape. The panel also carries the usual dialog manners — focus
 * moves in and is restored on close, Tab is trapped inside, and the page
 * behind is scroll-locked. It closes itself on navigation, so tapping
 * "View cart", "Checkout" or a product link gets the shopper where they are
 * going without a panel left hanging over the new page.
 */

/** Everything inside the panel that can hold focus, for the Tab trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { open, closeCart } = useCartDrawer();
  const {
    cart,
    cartCount,
    cartSubtotal,
    setQuantity,
    removeFromCart,
    hydrated,
    cartLoading,
    cartError,
    cartNeedsAuth,
    isLinePending,
    refreshCart,
    clearCartError,
    checkoutSettings,
  } = useStore();
  const pathname = usePathname();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Close on navigation. Comparing against the previous path (rather than
  // reacting to `open`) means opening the panel is never itself a reason to
  // close it.
  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    closeCart();
  }, [pathname, closeCart]);

  // Lock the page behind the panel, move focus in, and wire Escape + Tab.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Deferred so the panel is mounted before focus moves into it.
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 60);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, closeCart]);

  if (!open) return null;

  const shippingQuote = quoteShipping(checkoutSettings, cartSubtotal);
  const taxQuote = quoteTax(checkoutSettings, cartSubtotal);
  const orderTotal = cartSubtotal + shippingQuote.shipping + taxQuote.amount;
  const hasStockIssue = cart.some(
    (line) => cartStockIssue(line.product.stock, line.quantity) !== null,
  );

  return (
    <div
      className="fixed inset-0 z-[75]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Scrim — a full-area button so a click anywhere outside closes. */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full animate-[ap-fade_300ms_ease-out] bg-ash-100/50 backdrop-blur-[2px]"
        onClick={closeCart}
        aria-label="Close bag"
        tabIndex={-1}
      />

      <div ref={panelRef} className="ap-drawer-panel">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="cart-drawer-title" className="text-lg">
              Your bag
            </h2>
            <p className="ap-eyebrow mt-1 text-ink/45">
              {hydrated && !(cartLoading && cart.length === 0)
                ? pluralize(cartCount, "item")
                : "Loading…"}
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            className="-mr-2 flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
            aria-label="Close bag"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {!hydrated || (cartLoading && cart.length === 0) ? (
          /* Never flash "empty bag" while the server cart is still loading. */
          <div className="flex flex-1 items-center justify-center px-6 py-16">
            <p className="ap-eyebrow text-ink/40">Loading your bag…</p>
          </div>
        ) : cart.length === 0 && cartNeedsAuth ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-surface text-ink/45">
              <BagIcon className="h-7 w-7" />
            </span>

            <div>
              <h3 className="text-xl text-ink">Sign in to see your bag</h3>
              <p className="ap-body mx-auto mt-3 max-w-xs text-ink/65">
                Your bag is saved to your account, ready when you sign back in.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Button
                href="/login"
                variant="primary"
                size="md"
                withArrow
                className="w-full"
                onClick={closeCart}
              >
                Sign in
              </Button>
              <Button
                href="/signup"
                variant="outline"
                size="md"
                withArrow
                className="w-full"
                onClick={closeCart}
              >
                Create account
              </Button>
            </div>
          </div>
        ) : cart.length === 0 && cartError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-surface text-ink/45">
              <BagIcon className="h-7 w-7" />
            </span>

            <div>
              <h3 className="text-xl text-ink">We couldn&apos;t load your bag</h3>
              <p role="alert" className="ap-body mx-auto mt-3 max-w-xs text-ink/65">
                {cartError}
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              withArrow
              className="w-full"
              onClick={() => void refreshCart()}
            >
              Try again
            </Button>
          </div>
        ) : cart.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-surface text-ink/45">
              <BagIcon className="h-7 w-7" />
            </span>

            <div>
              <h3 className="text-xl text-ink">Your bag is empty</h3>
              <p className="ap-body mx-auto mt-3 max-w-xs text-ink/65">
                Nothing here yet. Start with the pieces everyone comes back for.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Button
                href="/new-arrivals"
                variant="primary"
                size="md"
                withArrow
                className="w-full"
                onClick={closeCart}
              >
                Shop new arrivals
              </Button>
              <Button
                href="/shop"
                variant="outline"
                size="md"
                withArrow
                className="w-full"
                onClick={closeCart}
              >
                Browse everything
              </Button>
            </div>
          </div>
        ) : (
          <>
            {cartError && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 border-b border-burnt/40 bg-burnt-900 px-5 py-3 sm:px-6"
              >
                <p className="ap-body text-xs text-burnt-200">{cartError}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      clearCartError();
                      void refreshCart();
                    }}
                    className="ap-eyebrow text-burnt underline underline-offset-4"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={clearCartError}
                    className="ap-eyebrow text-ink/45 underline underline-offset-4"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Lines */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
              <ul className="flex flex-col">
                {cart.map((line) => (
                  <li
                    key={`${line.productId}-${line.size}`}
                    className="flex gap-4 border-b border-line py-5 last:border-b-0"
                  >
                    <Link
                      href={`/products/${line.product.slug}`}
                      onClick={closeCart}
                      className="relative h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface"
                    >
                      <Image
                        src={productImageUrl(line.product, 0, { width: 200 })}
                        alt={line.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="ap-eyebrow text-ink/45">{line.product.categoryLabel}</p>
                          <h3 className="mt-1 text-sm leading-snug">
                            <Link
                              href={`/products/${line.product.slug}`}
                              onClick={closeCart}
                              className="transition-colors hover:text-burnt"
                            >
                              {line.product.name}
                            </Link>
                          </h3>
                          <p className="ap-body mt-1 text-xs text-ink/55">
                            {line.product.colors[0]?.name} · Size {line.size}
                          </p>
                          {cartStockIssue(line.product.stock, line.quantity) && (
                            <p role="alert" className="ap-body mt-1.5 text-xs font-medium text-burnt">
                              {cartStockIssue(line.product.stock, line.quantity)}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void removeFromCart(line.productId)}
                          disabled={isLinePending(line.productId)}
                          aria-label={`Remove ${line.product.name} from bag`}
                          aria-busy={isLinePending(line.productId)}
                          className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center text-ink/45 transition-colors hover:text-burnt disabled:cursor-wait disabled:opacity-40"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                        <div className="flex items-center rounded-full border border-line">
                          <button
                            type="button"
                            onClick={() => void setQuantity(line.productId, line.quantity - 1)}
                            disabled={isLinePending(line.productId)}
                            aria-label={`Decrease quantity of ${line.product.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface disabled:cursor-wait disabled:opacity-40"
                          >
                            <span aria-hidden="true" className="text-base leading-none">
                              &minus;
                            </span>
                          </button>

                          <span
                            className="w-8 text-center text-sm tabular-nums text-ink"
                            aria-live="polite"
                          >
                            {isLinePending(line.productId) ? "…" : line.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => void setQuantity(line.productId, line.quantity + 1)}
                            disabled={
                              isLinePending(line.productId) ||
                              (typeof line.product.stock === "number" &&
                                line.quantity >= line.product.stock)
                            }
                            aria-label={`Increase quantity of ${line.product.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span aria-hidden="true" className="text-base leading-none">
                              +
                            </span>
                          </button>
                        </div>

                        <p className="text-sm tabular-nums text-ink">
                          {formatPrice(line.lineTotal)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* Summary + calls to action */}
            <div className="border-t border-line bg-surface px-5 py-5 sm:px-6">
              <div>
                {shippingQuote.flatRate === 0 ? (
                  <p className="ap-body flex items-center gap-2 text-xs text-ash-200">
                    <TruckIcon className="h-4 w-4 shrink-0" />
                    Shipping is free on every order.
                  </p>
                ) : shippingQuote.hasFreeShippingTier ? (
                  shippingQuote.remaining > 0 ? (
                    <p className="ap-body text-xs text-ink/70">
                      You are{" "}
                      <span className="text-burnt">
                        {formatPrice(shippingQuote.remaining)}
                      </span>{" "}
                      away from complimentary shipping.
                    </p>
                  ) : (
                    <p className="ap-body flex items-center gap-2 text-xs text-ash-200">
                      <TruckIcon className="h-4 w-4 shrink-0" />
                      Your order ships free — nice one.
                    </p>
                  )
                ) : (
                  <p className="ap-body flex items-center gap-2 text-xs text-ink/70">
                    <TruckIcon className="h-4 w-4 shrink-0" />
                    Shipping is {formatPrice(shippingQuote.shipping)}.
                  </p>
                )}

                {shippingQuote.hasFreeShippingTier && (
                  <div
                    className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-valuenow={Math.round(shippingQuote.progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progress toward free shipping"
                  >
                    <div
                      className="h-full bg-burnt transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ width: `${shippingQuote.progress}%` }}
                    />
                  </div>
                )}
              </div>

              <dl className="ap-body mt-6 flex flex-col gap-2.5 border-t border-line pt-5 text-sm text-ink/70">
                <div className="flex justify-between gap-4">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums text-ink">{formatPrice(cartSubtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Shipping</dt>
                  <dd className="text-ink">
                    {shippingQuote.free ? "Free" : formatPrice(shippingQuote.shipping)}
                  </dd>
                </div>
                {taxQuote.ratePercent > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt>Tax ({taxQuote.ratePercent}%)</dt>
                    <dd className="tabular-nums text-ink">{formatPrice(taxQuote.amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t border-line pt-3 text-base">
                  <dt className="text-ink">Total</dt>
                  <dd className="tabular-nums text-ink">{formatPrice(orderTotal)}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-3">
                {hasStockIssue ? (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      withArrow
                      className="w-full"
                      disabled
                    >
                      Checkout unavailable
                    </Button>
                    <p role="alert" className="ap-body text-center text-xs text-burnt">
                      Remove out-of-stock items or reduce quantities to continue.
                    </p>
                  </>
                ) : (
                  <Button
                    href="/checkout"
                    variant="primary"
                    size="lg"
                    withArrow
                    className="w-full"
                    onClick={closeCart}
                  >
                    Checkout
                  </Button>
                )}
                <Button
                  href="/cart"
                  variant="outline"
                  size="md"
                  withArrow
                  className="w-full"
                  onClick={closeCart}
                >
                  View cart
                </Button>
              </div>

              <p className="ap-body mt-4 text-center text-[0.6875rem] text-ink/50">
                {taxQuote.ratePercent > 0
                  ? "Taxes calculated at checkout."
                  : "Taxes included."}{" "}
                Gift wrapping available at checkout.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}