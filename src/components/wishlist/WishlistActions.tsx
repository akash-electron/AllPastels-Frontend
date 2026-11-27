"use client";

import { useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type ActionState = "idle" | "moving" | "removing";

export function WishlistActions({ product }: { product: Product }) {
  const { addToCart, removeFromWishlist, isLinePending, isWishlistPending } =
    useStore();
  const [state, setState] = useState<ActionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const pending = state !== "idle";
  const soldOut = product.stock === 0;
  const busy = pending || isLinePending(product.id) || isWishlistPending(product.id);

  const handleMoveToCart = async () => {
    if (busy || soldOut) return;
    setState("moving");
    setError(null);

    const added = await addToCart(product.id, product.sizes[0] ?? "", 1);
    if (!added.ok) {
      setState("idle");
      setError(added.error);
      return;
    }

    const removed = await removeFromWishlist(product.id);
    if (!removed.ok) {
      setState("idle");
      setError(removed.error);
    }
  };

  const handleRemove = async () => {
    if (busy) return;
    setState("removing");
    setError(null);
    const result = await removeFromWishlist(product.id);
    if (!result.ok) {
      setState("idle");
      setError(result.error);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={handleMoveToCart}
          disabled={busy || soldOut}
          aria-busy={state === "moving"}
          className={cn(
            "ap-eyebrow border-b border-ink pb-1 text-ink transition-colors duration-300",
            "hover:border-burnt hover:text-burnt",
            "disabled:cursor-not-allowed disabled:border-line disabled:text-ink/35",
          )}
        >
          {soldOut
            ? "Out of stock"
            : state === "moving"
              ? "Moving to cart…"
              : "Move to cart"}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={busy}
          aria-busy={state === "removing"}
          className="ap-eyebrow text-ink/45 underline underline-offset-4 transition-colors duration-300 hover:text-burnt disabled:cursor-wait disabled:opacity-60"
        >
          {state === "removing" ? "Removing…" : "Remove"}
        </button>
      </div>
      {error && (
        <p role="alert" className="ap-body mt-2 text-xs text-burnt">
          {error}
        </p>
      )}
    </div>
  );
}
