"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useStore } from "@/components/store/StoreProvider";
import { useCartDrawer } from "@/components/store/CartDrawerProvider";
import { DeliveryCheck } from "@/components/product/DeliveryCheck";
import { SizeGuide } from "@/components/product/SizeGuide";
import { WishlistButton } from "@/components/product/WishlistButton";
import { Rating } from "@/components/ui/Rating";
import {
  BagIcon,
  MinusIcon,
  PlusIcon,
  ReturnIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { collections } from "@/data/collections";
import type { Product } from "@/lib/types";
import { cn, discountPercent, formatPrice } from "@/lib/utils";

/**
 * ProductInfo — the buy box.
 *
 * Holds the choices a shopper makes (colour, size, quantity), the price and
 * the add-to-bag action. Size is required before adding, because most
 * mistakes in fashion e-commerce are size mistakes.
 *
 * A successful add raises the existing <CartDrawer /> via `useCartDrawer` —
 * the same context the navbar uses. No second drawer, no second cart state.
 */

/** Accordions stay within a sane quantity of a single piece. */
const QTY_MAX = 10;

function Accordion({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const baseId = useId();

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        id={`${baseId}-btn`}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`${baseId}-panel`}
        className="group flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="ap-eyebrow text-ink/70 transition-colors duration-300 group-hover:text-ink">
          {label}
        </span>
        <PlusIcon
          className={cn(
            "h-4 w-4 shrink-0 text-ink/70 transition-transform duration-500 ease-editorial",
            open && "rotate-45",
          )}
        />
      </button>
      {/* Height animates through a 0fr→1fr grid row, so no measurement. */}
      <div
        id={`${baseId}-panel`}
        role="region"
        aria-labelledby={`${baseId}-btn`}
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-editorial",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ProductInfo({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const { openCart } = useCartDrawer();
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const discount = product.compareAtPrice
    ? discountPercent(product.price, product.compareAtPrice)
    : 0;
  const soldOut = product.stock === 0;
  const qtyMax = soldOut ? 1 : Math.max(1, Math.min(product.stock ?? QTY_MAX, QTY_MAX));

  // The buy box already tells the piece's story, so the accordion's details
  // list only carries curated care/fabric bullets — anything that merely
  // repeats the description would say the same thing twice.
  const details = product.details.filter((detail) => detail !== product.description);

  // Full collection records this piece belongs to, for the "part of" links.
  const productCollections = product.collections
    .map((slug) => collections.find((collection) => collection.slug === slug))
    .filter((collection) => collection !== undefined);

  const handleAdd = async () => {
    if (product.sizes.length > 0 && !size) {
      setError(true);
      return;
    }
    if (adding) return;

    setError(false);
    setAddError(null);
    setAdding(true);
    const result = await addToCart(product.id, size ?? "", qty);
    setAdding(false);

    if (!result.ok) {
      setAddError(result.error);
      return;
    }

    setQty(1);

    // Raise the existing bag panel so the shopper sees the line they just
    // added instead of hunting for the bag icon.
    openCart();
  };

  return (
    <div className="flex flex-col">
      {/* Category + title */}
      <p className="ap-eyebrow text-ink/60">{product.categoryLabel}</p>
      <h1 className="ap-balance mt-3 text-[clamp(2.1rem,3.2vw,3.1rem)] leading-[1.05]">
        {product.name}
      </h1>

      {/* Rating — links to the reviews section further down the page */}
      <a
        href="#reviews"
        className="mt-4 inline-flex w-fit items-center gap-3 transition-opacity hover:opacity-75"
      >
        <Rating value={product.rating} reviewCount={product.reviewCount} size="md" />
        <span className="ap-eyebrow normal-case tracking-normal text-burnt-300 underline underline-offset-4">
          Read reviews
        </span>
      </a>

      {/* Price */}
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <span className="font-display text-[1.75rem] leading-none tabular-nums text-ink">
          {formatPrice(product.price)}
        </span>
        {product.compareAtPrice && (
          <>
            <span className="text-base tabular-nums text-ink/40 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
            <span className="ap-eyebrow bg-cotton-500 px-2.5 py-1 text-[0.625rem] text-ash-100">
              Save {discount}%
            </span>
          </>
        )}
      </div>
      {soldOut && (
        <span className="ap-eyebrow mt-4 inline-flex w-fit items-center bg-cotton-500 px-2.5 py-1 text-[0.625rem] text-ash-100">
          Out of stock
        </span>
      )}
      <p className="ap-body mt-2.5 text-xs text-ink/65">
        Inclusive of all taxes
      </p>

      {/* Description */}
      {product.description && (
        <section aria-label="Product description" className="mt-9">
          <h2 className="ap-eyebrow text-ink/60">The piece</h2>
          <p className="ap-body mt-3.5 max-w-lg text-ink/75">{product.description}</p>
        </section>
      )}

      {/* Colours */}
      {product.colors.length > 0 && (
        <fieldset className="mt-8">
          <legend className="ap-eyebrow mb-3.5 text-ink/65">
            Colour: <span className="text-ink">{color}</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {product.colors.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => setColor(option.name)}
                aria-pressed={color === option.name}
                aria-label={option.name}
                title={option.name}
                className={cn(
                  "h-9 w-9 rounded-full ring-offset-[3px] ring-offset-canvas transition-all duration-300",
                  color === option.name
                    ? "ring-1 ring-ink"
                    : "ring-1 ring-line hover:scale-105 hover:ring-ink/50",
                )}
                style={{ backgroundColor: option.hex }}
              />
            ))}
          </div>
        </fieldset>
      )}

      {/* Sizes */}
      <fieldset className="mt-8">
        <legend className="ap-eyebrow mb-3.5 flex w-full items-center justify-between gap-4 text-ink/65">
          <span>
            Size
            {size ? (
              <span className="text-ink">: {size}</span>
            ) : (
              <span aria-hidden="true" className="text-burnt"> *</span>
            )}
            <span className="sr-only">required</span>
          </span>
          <button
            type="button"
            onClick={() => setSizeGuideOpen(true)}
            className="ap-eyebrow normal-case tracking-normal text-burnt-300 underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Size guide
          </button>
        </legend>

        <div className="grid max-w-md grid-cols-4 gap-2.5 sm:grid-cols-5">
          {product.sizes.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSize(option);
                setError(false);
              }}
              aria-pressed={size === option}
              className={cn(
                "flex min-h-12 items-center justify-center rounded-sm border px-3 text-sm tracking-wider transition-all duration-300",
                size === option
                  ? "border-ink bg-ink text-floral-900"
                  : "border-line bg-transparent text-ink hover:border-ink/50 hover:bg-surface",
                soldOut && "cursor-not-allowed opacity-50 hover:border-line hover:bg-transparent",
              )}
              disabled={soldOut}
            >
              {option}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="ap-body mt-3 text-xs text-burnt">
            Please select a size to continue.
          </p>
        )}
      </fieldset>

      {/* Quantity + wishlist — one aligned row of quiet controls */}
      <div className="mt-8 flex items-center gap-3">
        <div
          role="group"
          aria-label="Quantity"
          className="flex h-14 items-center rounded-full border border-line bg-surface transition-colors duration-300 hover:border-ink/40"
        >
          <button
            type="button"
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            disabled={qty <= 1 || soldOut}
            aria-label="Decrease quantity"
            className="flex h-full w-11 items-center justify-center rounded-l-full text-ink/75 transition-all duration-300 hover:text-burnt active:scale-90 disabled:cursor-not-allowed disabled:text-ink/25 disabled:hover:text-ink/25"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <span
            aria-live="polite"
            className="w-9 text-center text-sm font-medium tabular-nums text-ink"
          >
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((value) => Math.min(qtyMax, value + 1))}
            disabled={qty >= qtyMax || soldOut}
            aria-label="Increase quantity"
            className="flex h-full w-11 items-center justify-center rounded-r-full text-ink/75 transition-all duration-300 hover:text-burnt active:scale-90 disabled:cursor-not-allowed disabled:text-ink/25 disabled:hover:text-ink/25"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="h-14! w-14! min-h-0! bg-surface! hover:bg-ash-800! border border-line hover:border-ink/50"
        />
      </div>

      {/* Add to bag */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut || adding}
        aria-busy={adding}
        className={cn(
          "mt-3.5 flex h-14 w-full items-center justify-center gap-3 px-6 text-[0.6875rem] font-medium uppercase tracking-[0.24em] transition-all duration-500 ease-editorial active:scale-[0.99]",
          soldOut
            ? "cursor-not-allowed bg-ink/10 text-ink/50"
            : "bg-burnt text-floral-900 hover:bg-burnt-400 hover:shadow-[0_1.25rem_2rem_-1.25rem_rgba(220,121,84,0.55)]",
          adding && "cursor-wait opacity-70",
        )}
      >
        {soldOut ? (
          "Out of stock"
        ) : adding ? (
          "Adding to bag…"
        ) : (
          <>
            <BagIcon className="h-4 w-4" />
            Add to bag
          </>
        )}
      </button>

      {addError && (
        <p role="alert" className="ap-body mt-3 text-xs text-burnt">
          {addError}
        </p>
      )}

      {/* Delivery + PIN check */}
      <DeliveryCheck product={product} />

      {/* Size guide dialog */}
      <SizeGuide
        product={product}
        selectedSize={size}
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />

      {/* Details, shipping and the piece's facts, kept but tucked away */}
      <div className="mt-10 border-t border-line">
        {details.length > 0 && (
          <Accordion label="Details & care" defaultOpen>
            <ul className="ap-body flex flex-col gap-3 text-ink/70">
              {details.map((detail) => (
                <li key={detail} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-burnt" />
                  {detail}
                </li>
              ))}
            </ul>
          </Accordion>
        )}

        <Accordion label="Shipping & returns">
          <ul className="ap-body flex flex-col gap-3 text-ink/70">
            <li className="flex items-center gap-3">
              <TruckIcon className="h-5 w-5 shrink-0 text-burnt" />
              Complimentary shipping on orders over ₹2,999
            </li>
            <li className="flex items-center gap-3">
              <ReturnIcon className="h-5 w-5 shrink-0 text-burnt" />
              Free 15-day returns, no questions asked
            </li>
          </ul>
        </Accordion>

        <Accordion label="Good to know">
          <dl className="ap-body flex flex-col gap-4 text-ink/70">
            <div className="flex justify-between gap-6 border-b border-line pb-4">
              <dt className="text-ink/65">Category</dt>
              <dd>{product.categoryLabel}</dd>
            </div>
            {product.colors.length > 0 && (
              <div className="flex justify-between gap-6 border-b border-line pb-4">
                <dt className="text-ink/65">Colours</dt>
                <dd>{product.colors.map((c) => c.name).join(", ")}</dd>
              </div>
            )}
            {product.sizes.length > 0 && (
              <div className="flex justify-between gap-6 border-b border-line pb-4">
                <dt className="text-ink/65">Sizes</dt>
                <dd>{product.sizes.join(", ")}</dd>
              </div>
            )}
            {productCollections.length > 0 && (
              <div className="flex justify-between gap-6">
                <dt className="shrink-0 text-ink/65">Part of</dt>
                <dd className="text-right">
                  {productCollections.map((collection) => (
                    <Link
                      key={collection.slug}
                      href={collection.href}
                      className="block text-burnt-300 underline underline-offset-4 transition-opacity hover:opacity-70"
                    >
                      {collection.title}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </Accordion>
      </div>
    </div>
  );
}
