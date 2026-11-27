"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store/StoreProvider";
import { HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * WishlistButton — toggles a product in the saved list.
 *
 * Server-rendered pages pass the product id; state lives in the store so
 * the button stays in sync between the card, the product page and the
 * wishlist itself.
 */

interface WishlistButtonProps {
  productId: string;
  className?: string;
  /** Shows the product name in the accessible label. */
  productName?: string;
  size?: "sm" | "md";
}

export function WishlistButton({
  productId,
  className,
  productName,
  size = "md",
}: WishlistButtonProps) {
  const router = useRouter();
  const {
    isWishlisted,
    toggleWishlist,
    wishlistNeedsAuth,
    isWishlistPending,
  } = useStore();
  const [error, setError] = useState<string | null>(null);
  const active = isWishlisted(productId);
  const pending = isWishlistPending(productId);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const handleToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    if (wishlistNeedsAuth) {
      router.push("/login");
      return;
    }

    setError(null);
    const result = await toggleWishlist(productId);
    if (result.ok) return;

    if (result.unauthorized || result.reason === "unauthorized") {
      router.push("/login");
      return;
    }

    setError(result.error);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={active}
      aria-busy={pending}
      disabled={pending}
      title={error ?? undefined}
      aria-label={
        pending
          ? `Updating wishlist for ${productName ?? "item"}`
          : active
            ? `Remove ${productName ?? "item"} from wishlist`
            : `Save ${productName ?? "item"} to wishlist`
      }
      className={cn(
        "group/wish flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-500",
        "bg-floral/85 hover:bg-floral active:scale-95",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        pending && "cursor-wait opacity-70",
        className,
      )}
    >
      <HeartIcon
        className={cn(
          "transition-colors duration-300",
          size === "sm" ? "h-4 w-4" : "h-[1.15rem] w-[1.15rem]",
          active ? "text-burnt" : "text-ink/70 group-hover/wish:text-burnt",
          pending && "animate-pulse",
        )}
        filled={active}
      />
      <span className="sr-only" role="alert">
        {error ?? ""}
      </span>
    </button>
  );
}
