import type { Product } from "@/lib/types";

/**
 * Product Detail Experience — sizing and delivery helpers.
 *
 * Reviews are no longer mocked here: they live in `src/api/reviews` and are
 * backed by the database. What remains is local presentation data (size charts
 * and fit guidance) plus a deterministic delivery estimate.
 */

/* ========================================================================== *
 * Size guide
 * ========================================================================== */

export interface SizeChartRow {
  size: string;
  /** Garment measurements in inches, keyed by the column header. */
  measurements: Record<string, string>;
}

export interface SizeChart {
  /** Column headers, e.g. "Bust (in)". */
  columns: string[];
  rows: SizeChartRow[];
  /** One-line fit note shown above the table. */
  fitNote: string;
}

const APPAREL_CHART: SizeChart = {
  columns: ["Bust", "Waist", "Hip"],
  rows: [
    { size: "XS", measurements: { Bust: "32", Waist: "26", Hip: "35" } },
    { size: "S", measurements: { Bust: "34", Waist: "28", Hip: "37" } },
    { size: "M", measurements: { Bust: "36", Waist: "30", Hip: "39" } },
    { size: "L", measurements: { Bust: "38", Waist: "32", Hip: "41" } },
    { size: "XL", measurements: { Bust: "41", Waist: "35", Hip: "44" } },
    { size: "XXL", measurements: { Bust: "44", Waist: "38", Hip: "47" } },
  ],
  fitNote: "Fits true to size with a relaxed drape. Size up for a looser look.",
};

const KIDS_CHART: SizeChart = {
  columns: ["Height", "Chest", "Waist"],
  rows: [
    { size: "2-3Y", measurements: { Height: "36", Chest: "21", Waist: "20" } },
    { size: "4-5Y", measurements: { Height: "40", Chest: "22", Waist: "21" } },
    { size: "6-7Y", measurements: { Height: "44", Chest: "23", Waist: "22" } },
    { size: "8-9Y", measurements: { Height: "48", Chest: "25", Waist: "23" } },
    { size: "10-11Y", measurements: { Height: "52", Chest: "26", Waist: "24" } },
  ],
  fitNote: "Cut with room to grow. Allow a little extra for layering.",
};

const ONE_SIZE_CHART: SizeChart = {
  columns: ["Length", "Width"],
  rows: [{ size: "One Size", measurements: { Length: "28", Width: "22" } }],
  fitNote: "One size fits most — adjust the tie or fastening to your shape.",
};

/**
 * Picks the right chart for a product. Static and synchronous today; a real
 * implementation would fetch per-SKU measurements, so this is the one seam to
 * replace when sizing data arrives from the backend.
 */
export function getSizeChart(product: Product): SizeChart {
  if (product.sizes.some((size) => /\d+Y/.test(size))) return KIDS_CHART;
  if (product.sizes.length === 1) return ONE_SIZE_CHART;
  return APPAREL_CHART;
}

export const FIT_TIPS: { title: string; body: string }[] = [
  {
    title: "Between two sizes?",
    body: "Size up. Our cuts are already relaxed through the body, so sizing up rarely looks oversized — it just removes any pulling at the shoulder or hip.",
  },
  {
    title: "Measuring properly",
    body: "Measure over a light layer, keep the tape level and snug but not tight, and measure where the garment actually sits on your body.",
  },
  {
    title: "Not sure between two?",
    body: "Our returns are free for 15 days, so the safest choice is the size you would normally wear. We also list the measurements on every piece.",
  },
];

/* ========================================================================== *
 * Delivery
 * ========================================================================== */

export interface DeliveryEstimate {
  /** e.g. "Fri, 19 Sep – Tue, 23 Sep" */
  window: string;
  /** Working days, e.g. "3–5" */
  days: string;
  city: string;
  /** Cash on delivery availability. */
  codAvailable: boolean;
  /** Whether this piece qualifies for free shipping. */
  freeShipping: boolean;
  /** Human-readable summary. */
  message: string;
}

/**
 * MOCK delivery lookup.
 *
 * → `GET /api/delivery?pincode=560001`
 *
 * Deterministic from the PIN code, so the same code always returns the same
 * answer and the component behaves consistently between renders. Returns
 * `null` for anything that is not a serviceable 6-digit code.
 */
export async function checkDelivery(
  product: Product,
  pincode: string,
): Promise<DeliveryEstimate | null> {
  const code = pincode.trim();
  if (!/^\d{6}$/.test(code)) return null;

  const city = CITY_BY_PREFIX[code.slice(0, 2)];
  if (!city) return null;

  // Deterministic 2–5 working day range derived from the digits.
  const spread = (Number(code[2]) % 4) + 2;
  const days = `${spread}–${spread + 2}`;

  const start = new Date();
  const end = new Date(start.getTime() + (spread + 2) * 86400000);
  const format = (date: Date) =>
    date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return {
    window: `${format(start)} – ${format(end)}`,
    days,
    city,
    codAvailable: Number(code[4]) % 2 === 0,
    freeShipping: product.price >= 2999,
    message: `Delivers to ${city} in ${days} working days.`,
  };
}

/** Representative metro prefixes so the mock returns something recognisable. */
const CITY_BY_PREFIX: Record<string, string> = {
  "11": "Delhi",
  "12": "Chandigarh",
  "20": "Jaipur",
  "30": "Kota",
  "38": "Pune",
  "40": "Mumbai",
  "50": "Hyderabad",
  "56": "Bengaluru",
  "60": "Chennai",
  "70": "Kolkata",
};
