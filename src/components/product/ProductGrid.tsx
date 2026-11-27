import type { ReactNode } from "react";
import { StaggerGrid } from "@/components/animations/StaggerGrid";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";
import { pluralize } from "@/lib/utils";

/**
 * ProductGrid — responsive product layout.
 *
 * 2 columns on phones, 3 on tablets, 4 on desktop — the proportions
 * premium fashion sites use, because a 2-up phone grid is the only way to
 * keep imagery large enough to actually shop from.
 *
 * Wrapped in StaggerGrid so cards cascade in as the grid scrolls into view.
 */

interface ProductGridProps {
  products: Product[];
  showRating?: boolean;
  showQuickAdd?: boolean;
  /** Message shown when the grid is empty. */
  emptyMessage?: string;
  /** Optional heading rendered above the grid (used on /search). */
  heading?: string;
  /** Preload the first row's images — only for above-the-fold grids. */
  preloadFirstRow?: boolean;
  className?: string;
  /** Optional card footer content, such as wishlist actions. */
  renderActions?: (product: Product) => ReactNode;
}

export function ProductGrid({
  products,
  showRating = true,
  showQuickAdd = false,
  emptyMessage = "No pieces match those filters just yet. Try widening your selection.",
  heading,
  preloadFirstRow = false,
  className,
  renderActions,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 border border-dashed border-line bg-surface px-6 py-20 text-center">
        <p className="max-w-sm text-lg text-ink/70">{emptyMessage}</p>
        <Button href="/shop" variant="outline" size="sm" withArrow>
          Browse everything
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {heading && (
        <p className="ap-eyebrow mb-6 text-ink/50" role="status">
          {pluralize(products.length, "piece")} found
        </p>
      )}

      <StaggerGrid
        step={80}
        maxDelay={640}
        className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8"
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            showRating={showRating}
            showQuickAdd={showQuickAdd}
            preload={preloadFirstRow && index < 4}
            footer={renderActions?.(product)}
          />
        ))}
      </StaggerGrid>
    </div>
  );
}
