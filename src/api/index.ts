/**
 * Frontend API barrel.
 *
 * Feature-wise service modules, one per backend domain:
 * `src/api/<feature>/<feature>.api.ts`. Consumers import from here
 * (`import { signInCustomer } from "@/api"`) or deep-import a single
 * service file when they want an explicit dependency.
 */

export * from "@/api/auth/auth.api";
export * from "@/api/addresses/addresses.api";
export * from "@/api/products/products.api";
export * from "@/api/cart/cart.api";
export * from "@/api/wishlist/wishlist.api";
export * from "@/api/reviews/reviews.api";
export * from "@/api/orders/orders.api";
export * from "@/api/payments/payments.api";
export * from "@/api/settings/settings.api";
export * from "@/api/contact/contact.api";
export * from "@/api/coupons/coupons.api";
