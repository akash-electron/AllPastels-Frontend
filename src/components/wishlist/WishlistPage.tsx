"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import { Button } from "@/components/ui/Button";
import { ProductGrid } from "@/components/product/ProductGrid";
import { HeartIcon } from "@/components/ui/icons";
import { WishlistActions } from "@/components/wishlist/WishlistActions";
import { loadProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { pluralize } from "@/lib/utils";

/**
 * WishlistPage — saved items.
 *
 * Products are persisted on the backend for signed-in customers. Product ids
 * are resolved against the catalogue so the page degrades gracefully if an
 * item is no longer available.
 */
export function WishlistPage() {
  const {
    wishlist,
    wishlistLoading,
    wishlistError,
    wishlistNeedsAuth,
    refreshWishlist,
    hydrated,
  } = useStore();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(() => {
    setCatalogLoading(true);
    setCatalogError(null);
    loadProducts().then((result) => {
      if (result.ok) setCatalog(result.products);
      else setCatalogError(result.error);
      setCatalogLoading(false);
    });
  }, []);

  useEffect(() => {
    let active = true;
    loadProducts().then((result) => {
      if (!active) return;
      if (result.ok) setCatalog(result.products);
      else setCatalogError(result.error);
      setCatalogLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!hydrated || wishlistLoading || catalogLoading) {
    return (
      <div className="py-24 text-center">
        <p className="ap-eyebrow text-ink/40">Loading your saved items…</p>
      </div>
    );
  }

  if (wishlistNeedsAuth) {
    return (
      <div className="flex flex-col items-center gap-7 px-5 py-24 text-center sm:py-32">
        <HeartIcon className="h-10 w-10 text-burnt" />
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)]">Sign in to see your wishlist</h1>
          <p className="ap-body mx-auto mt-4 max-w-sm text-ink/65">
            Your saved pieces live with your account. Sign in to see them, or
            create an account to start saving.
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

  if (wishlistError || catalogError) {
    return (
      <div className="flex flex-col items-center gap-7 px-5 py-24 text-center sm:py-32">
        <HeartIcon className="h-10 w-10 text-burnt" />
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)]">We couldn&apos;t load your wishlist</h1>
          <p role="alert" className="ap-body mx-auto mt-4 max-w-sm text-ink/65">
            {wishlistError ?? catalogError}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          withArrow
          onClick={() => {
            void refreshWishlist();
            loadCatalog();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const saved = wishlist
    .map((id) => catalog.find((product) => product.id === id))
    .filter((product): product is Product => product !== undefined);

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center gap-7 px-5 py-24 text-center sm:py-32">
        <HeartIcon className="h-10 w-10 text-burnt" />
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.25rem)]">Nothing saved yet</h1>
          <p className="ap-body mx-auto mt-4 max-w-sm text-ink/65">
            Tap the heart on any piece to keep it here while you think about it.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="/shop" variant="primary" size="md" withArrow>
            Browse everything
          </Button>
          <Button href="/new-arrivals" variant="outline" size="md" withArrow>
            Shop new arrivals
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <h1 className="text-[clamp(2rem,4.5vw,3.25rem)]">Your wishlist</h1>
      <p className="ap-eyebrow mt-3 text-ink/45">{pluralize(saved.length, "saved piece")}</p>

      <div className="mt-10">
        <ProductGrid
          products={saved}
          showQuickAdd
          showRating
          renderActions={(product) => <WishlistActions product={product} />}
        />
      </div>
    </div>
  );
}
