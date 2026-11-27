"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addCartItem,
  addWishlistItem,
  clearCartRequest,
  getCart,
  getCheckoutSettings,
  getWishlist,
  removeCartItem,
  removeWishlistItem,
  updateCartItem,
} from "@/api";
import { loadProducts } from "@/lib/catalog";
import { photoSet } from "@/lib/images";
import { SESSION_CHANGE_EVENT } from "@/lib/session-events";
import type { CartActionResult, CartResult, ApiCart, ApiCartItem } from "@/types/cart";
import type { CheckoutSettings } from "@/types/settings";
import type { WishlistActionResult, WishlistResult } from "@/types/wishlist";
import type { Product } from "@/lib/types";

/**
 * Client-side commerce state (server-backed cart + wishlist).
 *
 * Signed-in customers use the backend cart and wishlist through the
 * authenticated `/api/cart` and `/api/wishlist` Route Handlers. Signed-out
 * shoppers use a localStorage bag that is folded into the server cart when
 * they sign in; the wishlist requires a session and is never stored locally.
 */

export interface CartLine {
  productId: string;
  size: string;
  quantity: number;
}

export interface CartLineDetail extends CartLine {
  product: Product;
  lineTotal: number;
}

interface StoreValue {
  cart: CartLineDetail[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (
    productId: string,
    size: string,
    quantity?: number,
  ) => Promise<CartActionResult>;
  removeFromCart: (productId: string) => Promise<CartActionResult>;
  setQuantity: (productId: string, quantity: number) => Promise<CartActionResult>;
  clearCart: () => Promise<CartActionResult>;

  /** Reload the cart from the backend (used by retry affordances). */
  refreshCart: () => Promise<void>;
  cartLoading: boolean;
  cartMutating: boolean;
  cartError: string | null;
  /** True when the customer has no valid session cookie. */
  cartNeedsAuth: boolean;
  clearCartError: () => void;
  isLinePending: (productId: string) => boolean;

  /** Live backend shipping/tax rules; null until loaded (or if unavailable). */
  checkoutSettings: CheckoutSettings | null;

  wishlist: string[];
  isWishlisted: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<WishlistActionResult>;
  removeFromWishlist: (productId: string) => Promise<WishlistActionResult>;
  toggleWishlist: (productId: string) => Promise<WishlistActionResult>;
  refreshWishlist: () => Promise<void>;
  wishlistLoading: boolean;
  wishlistMutating: boolean;
  wishlistError: string | null;
  wishlistNeedsAuth: boolean;
  clearWishlistError: () => void;
  isWishlistPending: (productId: string) => boolean;

  /** True once the initial cart request has completed. */
  hydrated: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

const GUEST_CART_KEY = "allpastels.guest-cart";
const CLEAR_PENDING_ID = "__all__";

const EMPTY_CART: ApiCart = { id: null, items: [], count: 0, total: 0 };

/** Persisted guest line. Name/price are snapshots until the catalogue loads. */
interface GuestCartLine {
  productId: string;
  qty: number;
  size?: string;
  name?: string;
  price?: number;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readGuestCart(): GuestCartLine[] {
  const raw = readStorage<unknown>(GUEST_CART_KEY, []);
  if (!Array.isArray(raw)) return [];

  const byProduct = new Map<string, GuestCartLine>();
  for (const value of raw) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    if (typeof record.productId !== "string" || !record.productId) continue;
    if (
      typeof record.qty !== "number" ||
      !Number.isInteger(record.qty) ||
      record.qty <= 0
    ) {
      continue;
    }

    const line: GuestCartLine = {
      productId: record.productId,
      qty: record.qty,
    };
    if (typeof record.size === "string" && record.size) line.size = record.size;
    if (typeof record.name === "string" && record.name) line.name = record.name;
    if (
      typeof record.price === "number" &&
      Number.isFinite(record.price) &&
      record.price >= 0
    ) {
      line.price = record.price;
    }

    const existing = byProduct.get(line.productId);
    if (existing) existing.qty += line.qty;
    else byProduct.set(line.productId, line);
  }

  return Array.from(byProduct.values());
}

function writeGuestCart(lines: GuestCartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
  } catch {
    // Private mode or quota exceeded — the in-memory cart still works.
  }
}

function buildGuestCart(lines: GuestCartLine[], catalog: Product[]): ApiCart {
  const items: ApiCartItem[] = lines.map((line) => {
    const product = catalog.find((candidate) => candidate.id === line.productId);
    const price = product?.price ?? line.price ?? 0;
    return {
      productId: line.productId,
      name: product?.name ?? line.name ?? "Product",
      price,
      qty: line.qty,
      size: line.size,
      lineTotal: price * line.qty,
      isActive:
        !product ||
        typeof product.stock !== "number" ||
        product.stock > 0,
    };
  });

  return {
    id: null,
    items,
    count: items.length,
    total: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

/**
 * Minimal Product projection for a cart line whose product is not present in
 * the loaded catalogue. Name and price are real values from the cart API; the
 * image is the same deterministic placeholder the catalogue uses.
 */
function cartItemProduct(item: ApiCartItem): Product {
  return {
    id: item.productId,
    slug: item.productId,
    name: item.name,
    category: "accessories",
    categoryLabel: "Product",
    price: item.price,
    photoSet: photoSet(item.productId),
    colors: [],
    sizes: [],
    summary: "",
    description: "",
    details: [],
    rating: 0,
    reviewCount: 0,
    isNew: false,
    isBestseller: false,
    moods: [],
    collections: [],
  };
}

function failedResult(
  result: Extract<CartResult, { ok: false }>,
): CartActionResult {
  return {
    ok: false,
    error: result.error,
    reason: result.reason,
    unauthorized: result.unauthorized,
  };
}

function failedWishlistResult(
  result: Extract<WishlistResult, { ok: false }>,
): WishlistActionResult {
  return {
    ok: false,
    error: result.error,
    reason: result.reason,
    unauthorized: result.unauthorized,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [cartData, setCartData] = useState<ApiCart>(EMPTY_CART);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const [cartNeedsAuth, setCartNeedsAuth] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [checkoutSettings, setCheckoutSettings] =
    useState<CheckoutSettings | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [wishlistNeedsAuth, setWishlistNeedsAuth] = useState(false);
  const [wishlistPendingIds, setWishlistPendingIds] = useState<string[]>([]);

  const cartRef = useRef<ApiCart>(EMPTY_CART);
  const pendingRef = useRef<Set<string>>(new Set());
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const catalogRef = useRef<Product[]>([]);
  const guestCartRef = useRef<GuestCartLine[]>([]);
  const guestLoadedRef = useRef(false);
  const cartModeRef = useRef<"guest" | "user">("guest");
  const cartResolvedRef = useRef(false);
  const mergingRef = useRef(false);
  const wishlistRef = useRef<string[]>([]);
  const wishlistPendingRef = useRef<Set<string>>(new Set());
  const wishlistChainRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    loadProducts().then((result) => {
      if (active && result.ok) {
        catalogRef.current = result.products;
        setCatalog(result.products);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getCheckoutSettings().then((result) => {
      if (active && result.ok) setCheckoutSettings(result.settings);
    });
    return () => {
      active = false;
    };
  }, []);

  const applyCart = useCallback((cart: ApiCart) => {
    cartRef.current = cart;
    setCartData(cart);
  }, []);

  /** Serialises cart calls so concurrent mutations cannot overwrite newer data. */
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = chainRef.current.then(task, task);
    chainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const enqueueWishlist = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = wishlistChainRef.current.then(task, task);
    wishlistChainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const applyWishlist = useCallback((productIds: string[]) => {
    wishlistRef.current = productIds;
    setWishlist(productIds);
  }, []);

  const fetchWishlist = useCallback(async () => {
    const result = await enqueueWishlist(() => getWishlist());

    if (result.ok) {
      applyWishlist(result.wishlist.productIds);
      setWishlistNeedsAuth(false);
      setWishlistError(null);
    } else if (result.unauthorized) {
      applyWishlist([]);
      setWishlistNeedsAuth(true);
      setWishlistError(null);
    } else {
      setWishlistError(result.error);
    }

    setWishlistLoading(false);
  }, [applyWishlist, enqueueWishlist]);

  const refreshWishlist = useCallback(async () => {
    setWishlistLoading(true);
    await fetchWishlist();
  }, [fetchWishlist]);

  const persistGuestCart = useCallback((lines: GuestCartLine[]) => {
    guestCartRef.current = lines;
    writeGuestCart(lines);
  }, []);

  const loadGuestCart = useCallback(() => {
    if (guestLoadedRef.current) return;
    guestCartRef.current = readGuestCart();
    guestLoadedRef.current = true;
  }, []);

  const applyGuestCart = useCallback(
    (lines: GuestCartLine[]) => {
      applyCart(buildGuestCart(lines, catalogRef.current));
      setSizes(() => {
        const next: Record<string, string> = {};
        for (const line of lines) {
          if (line.size) next[line.productId] = line.size;
        }
        return next;
      });
    },
    [applyCart],
  );

  /**
   * Folds the local guest bag into the signed-in customer's server cart. The
   * same product sums its quantities; successfully merged lines are removed
   * from the guest bag, while failures are kept for the next refresh.
   */
  const mergeGuestCartIntoServer = useCallback(
    async (serverCart: ApiCart): Promise<ApiCart> => {
      const lines = guestCartRef.current;
      if (lines.length === 0 || mergingRef.current) return serverCart;

      mergingRef.current = true;
      try {
        let latest = serverCart;
        const remaining: GuestCartLine[] = [];

        for (const line of lines) {
          const existing = latest.items.find(
            (item) => item.productId === line.productId,
          );

          if (existing) {
            const updated = await updateCartItem(
              line.productId,
              existing.qty + line.qty,
              line.size || existing.size,
            );
            if (updated.ok) {
              latest = updated.cart;
              continue;
            }
            if (updated.reason === "not-found") {
              const reAdded = await addCartItem(
                line.productId,
                line.qty,
                line.size,
              );
              if (reAdded.ok) {
                latest = reAdded.cart;
                continue;
              }
            }
            remaining.push(line);
            continue;
          }

          const added = await addCartItem(
            line.productId,
            line.qty,
            line.size,
          );
          if (added.ok) {
            latest = added.cart;
            continue;
          }

          if (added.reason === "duplicate") {
            const fresh = await getCart();
            if (fresh.ok) {
              latest = fresh.cart;
              const freshItem = latest.items.find(
                (item) => item.productId === line.productId,
              );
              if (freshItem) {
                const retried = await updateCartItem(
                  line.productId,
                  freshItem.qty + line.qty,
                  line.size || freshItem.size,
                );
                if (retried.ok) {
                  latest = retried.cart;
                  continue;
                }
              }
            }
          }

          remaining.push(line);
        }

        persistGuestCart(remaining);
        applyCart(latest);
        return latest;
      } finally {
        mergingRef.current = false;
      }
    },
    [applyCart, persistGuestCart],
  );

  const fetchCart = useCallback(async () => {
    loadGuestCart();
    const result = await enqueue(() => getCart());

    if (result.ok) {
      cartModeRef.current = "user";
      setCartNeedsAuth(false);
      setCartError(null);
      // Merge inside the queue so a sign-in landing alongside an add/update
      // cannot interleave partial cart writes.
      const cart =
        guestCartRef.current.length > 0
          ? await enqueue(() => mergeGuestCartIntoServer(result.cart))
          : result.cart;
      applyCart(cart);
    } else if (result.unauthorized) {
      // Guests keep their bag locally; no sign-in gate is required.
      cartModeRef.current = "guest";
      applyGuestCart(guestCartRef.current);
      setCartNeedsAuth(false);
      setCartError(null);
    } else {
      setCartError(result.error);
    }

    cartResolvedRef.current = true;
    setHydrated(true);
    setCartLoading(false);
  }, [applyCart, applyGuestCart, enqueue, loadGuestCart, mergeGuestCartIntoServer]);

  const refreshCart = useCallback(async () => {
    setCartLoading(true);
    await fetchCart();
  }, [fetchCart]);

  // Initial load plus a same-tab notification whenever the session changes
  // (sign-in, sign-out, stale-cookie cleanup). Focus refreshes quietly so a
  // cart changed in another tab is picked up without a loading flash.
  useEffect(() => {
    // Deferred one tick so the provider's first render is not followed by a
    // synchronous state update from inside the effect. The guest bag is read
    // before the first cart request so a signed-out visitor sees it at once.
    const timer = window.setTimeout(() => {
      loadGuestCart();
      void fetchCart();
      void fetchWishlist();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCart, fetchWishlist, loadGuestCart]);

  // Once the catalogue arrives, refresh guest line names and prices without
  // touching the signed-in server cart.
  useEffect(() => {
    if (!cartResolvedRef.current || cartModeRef.current !== "guest") return;
    applyGuestCart(guestCartRef.current);
  }, [catalog, applyGuestCart]);

  useEffect(() => {
    const onSessionChange = () => {
      void refreshCart();
      void refreshWishlist();
    };
    window.addEventListener(SESSION_CHANGE_EVENT, onSessionChange);
    return () => window.removeEventListener(SESSION_CHANGE_EVENT, onSessionChange);
  }, [refreshCart, refreshWishlist]);

  useEffect(() => {
    const onFocus = () => {
      void fetchCart();
      void fetchWishlist();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchCart, fetchWishlist]);

  const beginPending = useCallback((id: string) => {
    pendingRef.current.add(id);
    setPendingIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const endPending = useCallback((id: string) => {
    pendingRef.current.delete(id);
    setPendingIds((current) => current.filter((value) => value !== id));
  }, []);

  const addToCart = useCallback(
    async (
      productId: string,
      size: string,
      quantity = 1,
    ): Promise<CartActionResult> => {
      const qty = Math.floor(quantity);
      if (!productId || !Number.isInteger(qty) || qty <= 0) {
        return {
          ok: false,
          error: "Please choose a valid quantity.",
          reason: "invalid",
        };
      }
      if (pendingRef.current.has(productId)) {
        return {
          ok: false,
          error: "This piece is already being updated.",
          reason: "conflict",
        };
      }

      // Signed-out shoppers keep their bag in localStorage.
      if (cartModeRef.current !== "user") {
        loadGuestCart();
        const current = guestCartRef.current;
        const existing = current.find((line) => line.productId === productId);
        const product = catalogRef.current.find(
          (candidate) => candidate.id === productId,
        );
        const desired = (existing?.qty ?? 0) + qty;

        if (
          product &&
          typeof product.stock === "number" &&
          desired > product.stock
        ) {
          return {
            ok: false,
            error:
              product.stock <= 0
                ? "This piece is out of stock."
                : `Only ${product.stock} ${
                    product.stock === 1 ? "piece" : "pieces"
                  } left in stock.`,
            reason: "stock",
          };
        }

        const line: GuestCartLine = {
          productId,
          qty: desired,
          size: size || existing?.size,
          name: product?.name ?? existing?.name,
          price: product?.price ?? existing?.price,
        };
        const next = existing
          ? current.map((entry) =>
              entry.productId === productId ? line : entry,
            )
          : [...current, line];

        persistGuestCart(next);
        applyGuestCart(next);
        setCartError(null);
        return { ok: true };
      }

      beginPending(productId);
      try {
        const result = await enqueue(async (): Promise<CartResult> => {
          const current = cartRef.current;
          const existing = current.items.find((item) => item.productId === productId);
          const product = catalog.find((candidate) => candidate.id === productId);
          const desired = (existing?.qty ?? 0) + qty;

          if (
            product &&
            typeof product.stock === "number" &&
            desired > product.stock
          ) {
            return {
              ok: false,
              error:
                product.stock <= 0
                  ? "This piece is out of stock."
                  : `Only ${product.stock} ${
                      product.stock === 1 ? "piece" : "pieces"
                    } left in stock.`,
              status: 0,
              reason: "stock",
            };
          }

          // The backend keys carts by productId, so a duplicate add becomes a
          // quantity update rather than a second line.
          if (existing) {
            const updated = await updateCartItem(
              productId,
              desired,
              size || existing.size,
            );
            // The line disappeared in another tab between reads - add it back.
            return !updated.ok && updated.reason === "not-found"
              ? addCartItem(productId, qty, size)
              : updated;
          }

          const added = await addCartItem(productId, qty, size);
          if (added.ok || added.reason !== "duplicate") return added;

          // Another tab added the same product first: merge into its quantity.
          const fresh = await getCart();
          if (!fresh.ok) return added;
          const freshItem = fresh.cart.items.find(
            (item) => item.productId === productId,
          );
          if (!freshItem) return added;
          return updateCartItem(
            productId,
            freshItem.qty + qty,
            size || freshItem.size,
          );
        });

        if (!result.ok) {
          setCartError(result.error);
          if (result.reason === "unauthorized") setCartNeedsAuth(true);
          return failedResult(result);
        }

        applyCart(result.cart);
        if (typeof size === "string" && size) {
          setSizes((current) => ({ ...current, [productId]: size }));
        }
        setCartNeedsAuth(false);
        setCartError(null);
        return { ok: true };
      } finally {
        endPending(productId);
      }
    },
    [applyCart, applyGuestCart, beginPending, catalog, endPending, enqueue, loadGuestCart, persistGuestCart],
  );

  const removeFromCart = useCallback(
    async (productId: string): Promise<CartActionResult> => {
      if (pendingRef.current.has(productId)) {
        return {
          ok: false,
          error: "This piece is already being updated.",
          reason: "conflict",
        };
      }

      if (cartModeRef.current !== "user") {
        loadGuestCart();
        const next = guestCartRef.current.filter(
          (line) => line.productId !== productId,
        );
        persistGuestCart(next);
        applyGuestCart(next);
        setCartNeedsAuth(false);
        setCartError(null);
        return { ok: true };
      }

      beginPending(productId);
      try {
        const result = await enqueue(() => removeCartItem(productId));
        if (!result.ok) {
          setCartError(result.error);
          if (result.reason === "unauthorized") setCartNeedsAuth(true);
          return failedResult(result);
        }

        applyCart(result.cart);
        setSizes((current) => {
          const next = { ...current };
          delete next[productId];
          return next;
        });
        setCartNeedsAuth(false);
        setCartError(null);
        return { ok: true };
      } finally {
        endPending(productId);
      }
    },
    [applyCart, applyGuestCart, beginPending, endPending, enqueue, loadGuestCart, persistGuestCart],
  );

  const setQuantity = useCallback(
    async (productId: string, quantity: number): Promise<CartActionResult> => {
      if (!Number.isInteger(quantity)) {
        return {
          ok: false,
          error: "Quantity must be a whole number.",
          reason: "invalid",
        };
      }
      if (quantity <= 0) return removeFromCart(productId);
      if (pendingRef.current.has(productId)) {
        return {
          ok: false,
          error: "This piece is already being updated.",
          reason: "conflict",
        };
      }

      if (cartModeRef.current !== "user") {
        loadGuestCart();
        const current = guestCartRef.current;
        const existing = current.find((line) => line.productId === productId);
        const product = catalogRef.current.find(
          (candidate) => candidate.id === productId,
        );

        if (
          product &&
          typeof product.stock === "number" &&
          quantity > product.stock
        ) {
          return {
            ok: false,
            error:
              product.stock <= 0
                ? "This piece is out of stock."
                : `Only ${product.stock} ${
                    product.stock === 1 ? "piece" : "pieces"
                  } left in stock.`,
            reason: "stock",
          };
        }

        const line: GuestCartLine = {
          productId,
          qty: quantity,
          size: existing?.size,
          name: product?.name ?? existing?.name,
          price: product?.price ?? existing?.price,
        };
        const next = existing
          ? current.map((entry) =>
              entry.productId === productId ? line : entry,
            )
          : [...current, line];

        persistGuestCart(next);
        applyGuestCart(next);
        setCartNeedsAuth(false);
        setCartError(null);
        return { ok: true };
      }

      beginPending(productId);
      try {
        const result = await enqueue(async (): Promise<CartResult> => {
          const product = catalog.find((candidate) => candidate.id === productId);
          if (
            product &&
            typeof product.stock === "number" &&
            quantity > product.stock
          ) {
            return {
              ok: false,
              error:
                product.stock <= 0
                  ? "This piece is out of stock."
                  : `Only ${product.stock} ${
                      product.stock === 1 ? "piece" : "pieces"
                    } left in stock.`,
              status: 0,
              reason: "stock",
            };
          }
          const existing = cartRef.current.items.find(
            (item) => item.productId === productId,
          );
          return updateCartItem(productId, quantity, existing?.size);
        });

        if (!result.ok) {
          setCartError(result.error);
          if (result.reason === "unauthorized") setCartNeedsAuth(true);
          return failedResult(result);
        }

        applyCart(result.cart);
        setCartNeedsAuth(false);
        setCartError(null);
        return { ok: true };
      } finally {
        endPending(productId);
      }
    },
    [applyCart, applyGuestCart, beginPending, catalog, endPending, enqueue, loadGuestCart, persistGuestCart, removeFromCart],
  );

  const clearCart = useCallback(async (): Promise<CartActionResult> => {
    if (pendingRef.current.has(CLEAR_PENDING_ID)) {
      return {
        ok: false,
        error: "Your bag is already being cleared.",
        reason: "conflict",
      };
    }

    if (cartModeRef.current !== "user") {
      loadGuestCart();
      persistGuestCart([]);
      applyGuestCart([]);
      setCartNeedsAuth(false);
      setCartError(null);
      return { ok: true };
    }

    beginPending(CLEAR_PENDING_ID);
    try {
      const result = await enqueue(() => clearCartRequest());
      if (!result.ok) {
        setCartError(result.error);
        if (result.reason === "unauthorized") setCartNeedsAuth(true);
        return failedResult(result);
      }

      applyCart(result.cart);
      setSizes({});
      setCartNeedsAuth(false);
      setCartError(null);
      return { ok: true };
    } finally {
      endPending(CLEAR_PENDING_ID);
    }
  }, [applyCart, applyGuestCart, beginPending, endPending, enqueue, loadGuestCart, persistGuestCart]);

  const clearCartError = useCallback(() => setCartError(null), []);

  const beginWishlistPending = useCallback((id: string) => {
    wishlistPendingRef.current.add(id);
    setWishlistPendingIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }, []);

  const endWishlistPending = useCallback((id: string) => {
    wishlistPendingRef.current.delete(id);
    setWishlistPendingIds((current) => current.filter((value) => value !== id));
  }, []);

  const addToWishlist = useCallback(
    async (productId: string): Promise<WishlistActionResult> => {
      const trimmed = productId?.trim();
      if (!trimmed) {
        return {
          ok: false,
          error: "Please choose a valid product.",
          reason: "invalid",
        };
      }
      if (wishlistPendingRef.current.has(trimmed)) {
        return {
          ok: false,
          error: "This piece is already being updated.",
          reason: "conflict",
        };
      }
      if (wishlistRef.current.includes(trimmed)) return { ok: true };

      beginWishlistPending(trimmed);
      try {
        const result = await enqueueWishlist(() => addWishlistItem(trimmed));
        if (!result.ok) {
          if (result.unauthorized) {
            applyWishlist([]);
            setWishlistNeedsAuth(true);
          }
          return failedWishlistResult(result);
        }

        applyWishlist(result.wishlist.productIds);
        setWishlistNeedsAuth(false);
        setWishlistError(null);
        return { ok: true };
      } finally {
        endWishlistPending(trimmed);
      }
    },
    [applyWishlist, beginWishlistPending, endWishlistPending, enqueueWishlist],
  );

  const removeFromWishlist = useCallback(
    async (productId: string): Promise<WishlistActionResult> => {
      const trimmed = productId?.trim();
      if (!trimmed) {
        return {
          ok: false,
          error: "Please choose a valid product.",
          reason: "invalid",
        };
      }
      if (wishlistPendingRef.current.has(trimmed)) {
        return {
          ok: false,
          error: "This piece is already being updated.",
          reason: "conflict",
        };
      }
      if (!wishlistRef.current.includes(trimmed)) return { ok: true };

      beginWishlistPending(trimmed);
      try {
        const result = await enqueueWishlist(() => removeWishlistItem(trimmed));
        if (!result.ok) {
          if (result.unauthorized) {
            applyWishlist([]);
            setWishlistNeedsAuth(true);
          }
          return failedWishlistResult(result);
        }

        applyWishlist(result.wishlist.productIds);
        setWishlistNeedsAuth(false);
        setWishlistError(null);
        return { ok: true };
      } finally {
        endWishlistPending(trimmed);
      }
    },
    [applyWishlist, beginWishlistPending, endWishlistPending, enqueueWishlist],
  );

  const toggleWishlist = useCallback(
    (productId: string): Promise<WishlistActionResult> =>
      wishlistRef.current.includes(productId)
        ? removeFromWishlist(productId)
        : addToWishlist(productId),
    [addToWishlist, removeFromWishlist],
  );

  const clearWishlistError = useCallback(() => setWishlistError(null), []);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  );

  const isWishlistPending = useCallback(
    (productId: string) => wishlistPendingIds.includes(productId),
    [wishlistPendingIds],
  );

  const isLinePending = useCallback(
    (productId: string) => pendingIds.includes(productId),
    [pendingIds],
  );

  // Join backend lines with the catalogue for display metadata. The backend is
  // authoritative for quantity, price and totals.
  const detailedCart = useMemo<CartLineDetail[]>(
    () =>
      cartData.items.map((item) => {
        const product =
          catalog.find((candidate) => candidate.id === item.productId) ??
          cartItemProduct(item);
        const size =
          item.size || sizes[item.productId] || product.sizes[0] || "One size";
        return {
          productId: item.productId,
          size,
          quantity: item.qty,
          product,
          lineTotal: item.lineTotal,
        };
      }),
    [cartData, catalog, sizes],
  );

  const cartCount = useMemo(
    () => detailedCart.reduce((total, line) => total + line.quantity, 0),
    [detailedCart],
  );

  const value = useMemo<StoreValue>(
    () => ({
      cart: detailedCart,
      cartCount,
      cartSubtotal: cartData.total,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      refreshCart,
      cartLoading,
      cartMutating: pendingIds.length > 0,
      cartError,
      cartNeedsAuth,
      clearCartError,
      isLinePending,
      checkoutSettings,
      wishlist,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      refreshWishlist,
      wishlistLoading,
      wishlistMutating: wishlistPendingIds.length > 0,
      wishlistError,
      wishlistNeedsAuth,
      clearWishlistError,
      isWishlistPending,
      hydrated,
    }),
    [
      detailedCart,
      cartCount,
      cartData.total,
      addToCart,
      removeFromCart,
      setQuantity,
      clearCart,
      refreshCart,
      cartLoading,
      pendingIds.length,
      cartError,
      cartNeedsAuth,
      clearCartError,
      isLinePending,
      checkoutSettings,
      wishlist,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      refreshWishlist,
      wishlistLoading,
      wishlistPendingIds.length,
      wishlistError,
      wishlistNeedsAuth,
      clearWishlistError,
      isWishlistPending,
      hydrated,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a <StoreProvider>");
  }
  return context;
}
