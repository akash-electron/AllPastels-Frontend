export interface ApiWishlistItem {
  productId: string;
}

export interface ApiWishlist {
  id: string | null;
  productIds: string[];
  items: ApiWishlistItem[];
  count: number;
}

export type WishlistFailureReason =
  | "unauthorized"
  | "not-found"
  | "invalid"
  | "network"
  | "server"
  | "conflict";

export type WishlistResult =
  | { ok: true; wishlist: ApiWishlist }
  | {
      ok: false;
      error: string;
      status: number;
      reason: WishlistFailureReason;
      unauthorized?: boolean;
    };

export type WishlistActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      reason: WishlistFailureReason;
      unauthorized?: boolean;
    };
