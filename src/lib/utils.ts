/**
 * Formatting helpers shared across the storefront.
 */

/** Formats a number as an INR price string, e.g. 2499 -> "₹2,499". */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a 0-5 rating for display, e.g. 4.5 -> "4.5". */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Joins class names, dropping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Percentage saved when an item is reduced, e.g. 20. */
export function discountPercent(price: number, compareAtPrice: number): number {
  if (compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Builds a query string, omitting empty values. */
export function buildQuery(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, entry));
    } else {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Formats a product count for display: 1 -> "1 item", 4 -> "4 items". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Explains why a bag line can no longer be checked out.
 *
 * Undefined stock means the catalogue snapshot did not include a stock value,
 * so the server remains the source of truth for that line.
 */
export function cartStockIssue(
  stock: number | undefined,
  quantity: number,
): string | null {
  if (typeof stock !== "number") return null;
  if (stock <= 0) return "Out of stock";
  if (quantity > stock) {
    return `Only ${stock} ${stock === 1 ? "unit" : "units"} available`;
  }
  return null;
}
