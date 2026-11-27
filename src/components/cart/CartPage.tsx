"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/components/store/StoreProvider";
import { Button } from "@/components/ui/Button";
import { quoteShipping, quoteTax } from "@/lib/checkout-settings";
import { productImageUrl } from "@/lib/images";
import { cartStockIssue, formatPrice, pluralize } from "@/lib/utils";
import { ArrowRightIcon, CloseIcon } from "@/components/ui/icons";

/**
 * CartPage — the bag.
 *
 * Reads and writes the same store as the quick-add buttons, so a bag filled
 * from a listing page is already here when the shopper arrives. The
 * free-shipping progress bar is the one piece of urgency worth adding.
 */
export function CartPage() {
  const {
    cart,
    cartSubtotal,
    setQuantity,
    removeFromCart,
    cartCount,
    hydrated,
    cartLoading,
    cartError,
    cartNeedsAuth,
    isLinePending,
    refreshCart,
    clearCartError,
    checkoutSettings,
  } = useStore();

  // Avoid a flash of "empty bag" while the server cart is still loading.
  if (!hydrated || (cartLoading && cart.length === 0)) {
    return (
      <div className="py-24 text-center">
        <p className="ap-eyebrow text-ink/40">Loading your bag…</p>
      </div>
    );
  }

  if (cart.length === 0 && cartNeedsAuth) {
    return (
      <div className="flex flex-col items-center gap-7 px-5 py-24 text-center sm:py-32">
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)]">Sign in to see your bag</h1>
          <p className="ap-body mx-auto mt-4 max-w-sm text-ink/65">
            Your bag is saved to your account. Sign in to pick up where you left
            off, or create an account to start one.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/login" variant="primary" size="md" withArrow>
            Sign in
          </Button>
          <Button href="/signup" variant="outline" size="md" withArrow>
            Create account
          </Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && cartError) {
    return (
      <div className="flex flex-col items-center gap-7 px-5 py-24 text-center sm:py-32">
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)]">We couldn&apos;t load your bag</h1>
          <p role="alert" className="ap-body mx-auto mt-4 max-w-sm text-ink/65">
            {cartError}
          </p>
        </div>
        <Button type="button" variant="primary" size="md" withArrow onClick={refreshCart}>
          Try again
        </Button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center gap-7 px-5 py-24 text-center sm:py-32">
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)]">Your bag is empty</h1>
          <p className="ap-body mx-auto mt-4 max-w-sm text-ink/65">
            Nothing here yet. Start with the pieces everyone comes back for, or
            browse the new arrivals.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/new-arrivals" variant="primary" size="md" withArrow>
            Shop new arrivals
          </Button>
          <Button href="/shop" variant="outline" size="md" withArrow>
            Browse everything
          </Button>
        </div>
      </div>
    );
  }

  const shippingQuote = quoteShipping(checkoutSettings, cartSubtotal);
  const taxQuote = quoteTax(checkoutSettings, cartSubtotal);
  const orderTotal = cartSubtotal + shippingQuote.shipping + taxQuote.amount;
  const hasStockIssue = cart.some(
    (line) => cartStockIssue(line.product.stock, line.quantity) !== null,
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <h1 className="text-[clamp(2rem,4.5vw,3.25rem)]">Your bag</h1>
      <p className="ap-eyebrow mt-3 text-ink/45">{pluralize(cartCount, "item")}</p>

      {cartError && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-burnt/40 bg-burnt-900 px-4 py-3"
        >
          <p className="ap-body text-sm text-burnt-200">{cartError}</p>
          <div className="flex items-center gap-4">
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

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
        {/* Lines */}
        <div>
          <ul className="flex flex-col">
            {cart.map((line) => (
              <li
                key={`${line.productId}-${line.size}`}
                className="flex gap-4 border-b border-line py-6 sm:gap-6"
              >
                <Link
                  href={`/products/${line.product.slug}`}
                  className="relative h-32 w-24 shrink-0 overflow-hidden bg-surface sm:h-40 sm:w-32"
                >
                  <Image
                    src={productImageUrl(line.product, 0, { width: 260 })}
                    alt={line.product.name}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="ap-eyebrow text-ink/45">{line.product.categoryLabel}</p>
                      <h2 className="mt-1.5">
                        <Link
                          href={`/products/${line.product.slug}`}
                          className="text-sm transition-colors hover:text-burnt sm:text-base"
                        >
                          {line.product.name}
                        </Link>
                      </h2>
                      <p className="ap-body mt-1.5 text-xs text-ink/55">
                        {line.product.colors[0]?.name} · Size {line.size}
                      </p>
                      {cartStockIssue(line.product.stock, line.quantity) && (
                        <p role="alert" className="ap-body mt-2 text-xs font-medium text-burnt">
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
                      className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center text-ink/50 transition-colors hover:text-burnt disabled:cursor-wait disabled:opacity-40"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
                    <div className="flex items-center border border-line">
                      <button
                        type="button"
                        onClick={() => void setQuantity(line.productId, line.quantity - 1)}
                        disabled={isLinePending(line.productId)}
                        aria-label="Decrease quantity"
                        className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-surface disabled:cursor-wait disabled:opacity-40"
                      >
                        <span aria-hidden="true" className="text-base leading-none">
                          &minus;
                        </span>
                      </button>
                      <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
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
                        aria-label="Increase quantity"
                        className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span aria-hidden="true" className="text-base leading-none">
                          +
                        </span>
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-sm tabular-nums text-ink">{formatPrice(line.lineTotal)}</p>
                      {line.quantity > 1 && (
                        <p className="ap-eyebrow mt-0.5 text-ink/40">
                          {formatPrice(line.product.price)} each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/shop"
            className="ap-eyebrow mt-8 inline-flex items-center gap-2 text-burnt transition-opacity hover:opacity-70"
          >
            Continue shopping
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="bg-surface p-6 sm:p-8">
            <h2 className="text-xl">Order summary</h2>

            {/* Free shipping progress */}
            <div className="mt-6">
              {shippingQuote.flatRate === 0 ? (
                <p className="ap-body text-sm text-ash-200">
                  Shipping is free on every order.
                </p>
              ) : shippingQuote.hasFreeShippingTier ? (
                shippingQuote.remaining > 0 ? (
                  <p className="ap-body text-sm text-ink/70">
                    You are{" "}
                    <span className="text-burnt">
                      {formatPrice(shippingQuote.remaining)}
                    </span>{" "}
                    away from complimentary shipping.
                  </p>
                ) : (
                  <p className="ap-body text-sm text-ash-200">
                    Your order ships free — nice one.
                  </p>
                )
              ) : (
                <p className="ap-body text-sm text-ink/70">
                  Shipping is {formatPrice(shippingQuote.shipping)}.
                </p>
              )}

              {shippingQuote.hasFreeShippingTier && (
                <div
                  className="mt-3 h-1 w-full overflow-hidden bg-line"
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

            <dl className="ap-body mt-7 flex flex-col gap-3 border-t border-line pt-6 text-ink/70">
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

            {hasStockIssue ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  withArrow
                  className="mt-7 w-full"
                  disabled
                >
                  Checkout unavailable
                </Button>
                <p role="alert" className="ap-body mt-4 text-center text-xs text-burnt">
                  Remove out-of-stock items or reduce quantities to continue.
                </p>
              </>
            ) : (
              <Button href="/checkout" variant="primary" size="lg" withArrow className="mt-7 w-full">
                Checkout
              </Button>
            )}

            <p className="ap-body mt-4 text-center text-xs text-ink/50">
              {taxQuote.ratePercent > 0
                ? "Taxes calculated at checkout."
                : "Taxes included."}{" "}
              Gift wrapping available at checkout.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

