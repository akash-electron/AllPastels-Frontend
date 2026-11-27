import { useCallback, useEffect, useState } from "react";
import { AccountPanel } from "@/components/account/AccountPanel";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useStore } from "@/components/store/StoreProvider";
import { Button } from "@/components/ui/Button";
import { HeartIcon } from "@/components/ui/icons";
import { WishlistActions } from "@/components/wishlist/WishlistActions";
import { loadProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { pluralize } from "@/lib/utils";

/**
 * Wishlist — the saved pieces, in place.
 *
 * Reuses the storefront's own grid rather than inventing a dashboard
 * variant, so a saved item looks exactly as it does everywhere else and
 * the quick-add and wishlist controls keep working from here.
 */
export function AccountWishlist() {
  const {
    wishlist,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
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

  const saved = wishlist
    .map((id) => catalog.find((product) => product.id === id))
    .filter((product): product is Product => product !== undefined);

  return (
    <AccountPanel
      id="account-wishlist"
      eyebrow="Wishlist"
      title="Saved pieces"
      meta={pluralize(saved.length, "saved piece")}
    >
      {wishlistLoading || catalogLoading ? (
        <div className="border border-line bg-surface/40 px-6 py-16 text-center">
          <p className="ap-eyebrow text-ink/40">Loading your saved items…</p>
        </div>
      ) : wishlistError || catalogError ? (
        <div className="flex flex-col items-center gap-6 border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
          <HeartIcon className="h-9 w-9 text-burnt" />
          <div>
            <p className="text-lg text-ink">We couldn&apos;t load your wishlist</p>
            <p role="alert" className="ap-body mx-auto mt-2 max-w-sm text-sm text-ink/60">
              {wishlistError ?? catalogError}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            withArrow
            onClick={() => {
              void refreshWishlist();
              loadCatalog();
            }}
          >
            Try again
          </Button>
        </div>
      ) : saved.length === 0 ? (
        <div className="flex flex-col items-center gap-6 border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
          <HeartIcon className="h-9 w-9 text-burnt" />
          <div>
            <p className="text-lg text-ink">Nothing saved yet</p>
            <p className="ap-body mx-auto mt-2 max-w-sm text-sm text-ink/60">
              Tap the heart on any piece to keep it here while you think about it.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/shop" variant="primary" size="sm" withArrow>
              Browse everything
            </Button>
            <Button href="/new-arrivals" variant="outline" size="sm" withArrow>
              Shop new arrivals
            </Button>
          </div>
        </div>
      ) : (
        <ProductGrid
          products={saved}
          showRating
          showQuickAdd
          renderActions={(product) => <WishlistActions product={product} />}
        />
      )}
    </AccountPanel>
  );
}
