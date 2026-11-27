import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Rating } from "@/components/ui/Rating";
import { QuickAdd } from "@/components/product/QuickAdd";
import { WishlistButton } from "@/components/product/WishlistButton";
import { productImageUrl } from "@/lib/images";
import type { Product } from "@/lib/types";
import { cn, discountPercent, formatPrice } from "@/lib/utils";

/**
 * ProductCard — the single card used across the homepage, listing pages,
 * search results, collections and the wishlist.
 *
 * Behaviour:
 * - The primary photograph swaps to the second shot on hover (desktop only).
 * - A wishlist control sits in the top-right of the image.
 * - A quick-add bar slides up from the bottom on hover, and is always
 *   visible on touch devices where there is no hover state.
 */

interface ProductCardProps {
  product: Product;
  /** Shows the star rating. Use in bestsellers and listing pages. */
  showRating?: boolean;
  /** Shows the quick-add bar. */
  showQuickAdd?: boolean;
  /** Colour swatch dots beneath the title. */
  showColors?: boolean;
  /** Extra classes on the wrapper. */
  className?: string;
  /** `sizes` hint for next/image. */
  sizes?: string;
  /** Preload the image — only for above-the-fold cards. */
  preload?: boolean;
  /** Optional card-specific actions rendered beneath the metadata. */
  footer?: ReactNode;
}

export function ProductCard({
  product,
  showRating = false,
  showQuickAdd = false,
  showColors = true,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  preload = false,
  footer,
}: ProductCardProps) {
  const href = `/products/${product.slug}`;
  const discount = product.compareAtPrice
    ? discountPercent(product.price, product.compareAtPrice)
    : 0;

  return (
    <article className={cn("group/card relative flex flex-col", className)}>
      {/* Image */}
      <div className="relative overflow-hidden bg-surface">
        <Link href={href} className="block" tabIndex={-1} aria-hidden="true">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={productImageUrl(product, 0, { width: 600 })}
              alt={product.name}
              fill
              sizes={sizes}
              // Only above-the-fold product cards are preloaded.
              preload={preload}
              className="object-cover transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.04] group-hover/card:opacity-0"
            />
            <Image
              src={productImageUrl(product, 1, { width: 600 })}
              alt=""
              fill
              sizes={sizes}
              loading="lazy"
              className="object-cover opacity-0 transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.04] group-hover/card:opacity-100"
            />
          </div>
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discount > 0 && (
            <span className="ap-eyebrow bg-burnt px-2.5 py-1 text-floral-900">{discount}% off</span>
          )}
{product.isNew && !product.badge && (
  <span className="ap-eyebrow bg-ash px-2.5 py-1 text-ink">New</span>
)}
{product.stock === 0 && (
  <span className="ap-eyebrow bg-ink/80 px-2.5 py-1 text-floral-900">Out of stock</span>
)}
        </div>

        <WishlistButton
          productId={product.id}
          productName={product.name}
          size="sm"
          className="absolute right-3 top-3 opacity-0 transition-opacity duration-500 focus-visible:opacity-100 group-hover/card:opacity-100 max-md:opacity-100"
        />

        {/* Quick add — slides up on hover, always present on touch */}
        {showQuickAdd && product.stock !== 0 && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "group-hover/card:translate-y-0 focus-within:translate-y-0",
              "max-md:translate-y-0",
            )}
          >
            <QuickAdd
              productId={product.id}
              productName={product.name}
              sizes={product.sizes}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex min-w-0 flex-1 flex-col pt-4">
        <p className="ap-eyebrow text-ink/45">{product.categoryLabel}</p>

        <h3 className="mt-1.5 min-w-0 text-[0.9375rem] leading-snug line-clamp-2">
          <Link href={href} className="transition-colors duration-300 hover:text-burnt">
            {product.name}
          </Link>
        </h3>

        {showRating && (
          <Rating value={product.rating} reviewCount={product.reviewCount} className="mt-2" />
        )}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-sm tabular-nums text-ink">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <>
              <span className="text-sm tabular-nums text-ink/40 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
              <span className="ap-eyebrow text-burnt">Save {discount}%</span>
            </>
          )}
        </div>

        {showColors && product.colors.length > 0 && (
          <ul className="mt-3 flex items-center gap-1.5" aria-label="Available colours">
            {product.colors.slice(0, 4).map((color) => (
              <li key={color.name}>
                <span
                  title={color.name}
                  className="block h-3 w-3 rounded-full ring-1 ring-line"
                  style={{ backgroundColor: color.hex }}
                >
                  <span className="sr-only">{color.name}</span>
                </span>
              </li>
            ))}
            {product.colors.length > 4 && (
              <li className="ap-eyebrow text-ink/40">+{product.colors.length - 4}</li>
            )}
          </ul>
        )}

        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </article>
  );
}
