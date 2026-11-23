"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getPaymentOptions, placeGuestOrder, placeOrderFromCart, previewOrder } from "@/api";
import { useAuth } from "@/components/store/AuthProvider";
import { useStore } from "@/components/store/StoreProvider";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  GiftIcon,
  LockIcon,
  ReturnIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { quoteShipping, quoteTax } from "@/lib/checkout-settings";
import { productImageUrl } from "@/lib/images";
import { COUPON_CODE_MAX_LENGTH, normalizeCouponCode } from "@/api/coupons/coupons.api";
import { payOrder } from "@/lib/pay-order";
import { SITE } from "@/data/site";
import type { OrderPreview } from "@/types/order";
import { cn, formatPrice, pluralize } from "@/lib/utils";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * CheckoutPage — a single-page checkout for signed-in and guest shoppers.
 *
 * Delivery details are validated locally. Signed-in customers check out their
 * server cart; guests check out their local bag. The backend owns item prices,
 * stock checks, coupon validation, shipping, tax and the final total.
 */

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

/** Light client-side validation, mirroring the HTML constraints below. */
function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};

  if (!values.fullName.trim()) errors.fullName = "Please enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    errors.email = "Please enter a valid email address";
  }
  if (values.phone.replace(/\D/g, "").length < 10) {
    errors.phone = "Please enter a 10-digit phone number";
  }
  if (!values.address.trim()) errors.address = "Please enter your address";
  if (!values.city.trim()) errors.city = "Please enter your city";
  if (!values.state.trim()) errors.state = "Please enter your state";
  if (!/^\d{6}$/.test(values.pincode.trim())) errors.pincode = "Enter a 6-digit PIN code";

  return errors;
}

const FIELDS: {
  name: keyof FormValues;
  label: string;
  type: string;
  autoComplete: string;
  span: 2 | 3 | 6;
  placeholder?: string;
  hint?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  maxLength?: number;
}[] = [
  {
    name: "fullName",
    label: "Full name",
    type: "text",
    autoComplete: "name",
    span: 3,
    placeholder: "Aarav Patel",
  },
  {
    name: "phone",
    label: "Phone number",
    type: "tel",
    autoComplete: "tel",
    span: 3,
    placeholder: "+91 98765 43210",
    inputMode: "tel",
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    autoComplete: "email",
    span: 6,
    placeholder: "you@example.com",
    hint: "Order confirmation and delivery updates go here.",
    inputMode: "email",
  },
  {
    name: "address",
    label: "Street address",
    type: "text",
    autoComplete: "street-address",
    span: 6,
    placeholder: "House / flat, building, street, area",
  },
  {
    name: "city",
    label: "City",
    type: "text",
    autoComplete: "address-level2",
    span: 2,
    placeholder: "Mumbai",
  },
  {
    name: "state",
    label: "State",
    type: "text",
    autoComplete: "address-level1",
    span: 2,
    placeholder: "Maharashtra",
  },
  {
    name: "pincode",
    label: "PIN code",
    type: "text",
    autoComplete: "postal-code",
    span: 2,
    placeholder: "400001",
    inputMode: "numeric",
    maxLength: 6,
  },
];

function SectionHeading({
  id,
  step,
  title,
  description,
}: {
  id: string;
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      <span className="ap-eyebrow mt-1 shrink-0 text-burnt/70">{step}</span>
      <div className="min-w-0">
        <h2 id={id} className="text-[clamp(1.3rem,2.2vw,1.55rem)]">
          {title}
        </h2>
        <p className="ap-body mt-2 max-w-lg text-sm text-ink/60">{description}</p>
      </div>
    </div>
  );
}

function CheckoutField({
  field,
  value,
  error,
  onChange,
}: {
  field: (typeof FIELDS)[number];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const inputId = `checkout-${field.name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : field.hint ? hintId : undefined;
  const spanClass =
    field.span === 6
      ? "sm:col-span-6"
      : field.span === 3
        ? "sm:col-span-3"
        : "sm:col-span-2";

  return (
    <div className={cn("group/field", spanClass)}>
      <label
        htmlFor={inputId}
        className="ap-eyebrow mb-2 block text-ink/55 transition-colors duration-300 group-focus-within/field:text-burnt"
      >
        {field.label}
      </label>
      <div
        className={cn(
          "border bg-floral transition-all duration-300",
          error
            ? "border-burnt bg-burnt-900/40"
            : "border-line hover:border-ash-400 focus-within:border-burnt focus-within:bg-floral-600",
        )}
      >
        <input
          id={inputId}
          name={field.name}
          type={field.type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="w-full bg-transparent px-3.5 py-3.5 text-sm text-ink outline-none placeholder:text-ink/30"
        />
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="ap-body mt-2 border-l border-burnt/50 pl-2 text-xs text-burnt-400"
        >
          {error}
        </p>
      ) : field.hint ? (
        <p id={hintId} className="ap-body mt-2 text-xs text-ink/45">
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutPage() {
  const { cart, cartSubtotal, refreshCart, clearCart, hydrated, checkoutSettings } =
    useStore();
  const { session, hydrated: authHydrated } = useAuth();
  const router = useRouter();
  const checkoutKeyRef = useRef("");
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<OrderPreview | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const couponRequestRef = useRef(0);

  type PaymentChoice = "cod" | "razorpay" | "stripe";
  const [paymentMethods, setPaymentMethods] = useState<PaymentChoice[]>(["cod"]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentChoice>("cod");
  const [paying, setPaying] = useState(false);

  const shippingQuote = quoteShipping(checkoutSettings, cartSubtotal);
  const taxQuote = quoteTax(checkoutSettings, cartSubtotal);
  const normalizedCoupon = normalizeCouponCode(couponCode);
  const effectivePreview =
    normalizedCoupon && couponPreview?.coupon ? couponPreview : null;
  const appliedCoupon = effectivePreview?.coupon ?? null;
  const shipping = effectivePreview ? effectivePreview.shipping : shippingQuote.shipping;
  const shippingFree = effectivePreview ? effectivePreview.shippingFree : shippingQuote.free;
  const tax = effectivePreview ? effectivePreview.tax : taxQuote.amount;
  const taxRatePercent = effectivePreview
    ? effectivePreview.taxRatePercent
    : taxQuote.ratePercent;
  const discount = effectivePreview ? effectivePreview.discount : 0;
  const total = effectivePreview
    ? effectivePreview.total
    : cartSubtotal + shippingQuote.shipping + taxQuote.amount;

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      setValues((current) => ({
        ...current,
        fullName: current.fullName || session.name,
        email: current.email || session.email || "",
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getPaymentOptions();
      if (cancelled) return;
      if (result.ok) {
        const available = result.options.methods.length
          ? result.options.methods
          : (["cod"] as PaymentChoice[]);
        setPaymentMethods(available as PaymentChoice[]);
        const initial =
          result.options.defaultOnline &&
          available.includes(result.options.defaultOnline)
            ? result.options.defaultOnline
            : available.includes("cod")
              ? "cod"
              : available[0];
        setSelectedPayment(initial as PaymentChoice);
      } else {
        setPaymentMethods(["cod"]);
        setSelectedPayment("cod");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced server-side coupon check so the summary reflects the discount
  // before the customer submits. Request ids discard stale responses.
  useEffect(() => {
    if (!normalizedCoupon) return;

    const requestId = couponRequestRef.current + 1;
    couponRequestRef.current = requestId;

    const timer = window.setTimeout(() => {
      void (async () => {
        setCouponChecking(true);
        const result = await previewOrder({
          items: cart.map((line) => ({
            productId: line.productId,
            qty: line.quantity,
            size: line.size,
          })),
          couponCode: normalizedCoupon,
        });
        if (couponRequestRef.current !== requestId) return;

        setCouponChecking(false);
        if (!result.ok) {
          setCouponPreview(null);
          setCouponError(result.error);
          return;
        }
        setCouponPreview(result.preview);
        setCouponError(null);
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [normalizedCoupon, cart]);

  const updateCoupon = (value: string) => {
    setCouponCode(value);
    couponRequestRef.current += 1;
    setCouponPreview(null);
    setCouponError(null);
    setCouponChecking(normalizeCouponCode(value).length > 0);
  };

  const update = (name: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (placing) return;

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitError(null);
    setPlacing(true);
    const shippingAddress = {
      fullName: values.fullName.trim(),
      line1: values.address.trim(),
      city: values.city.trim(),
      state: values.state.trim() || undefined,
      postalCode: values.pincode.trim(),
      country: "India",
      phone: values.phone.trim() || undefined,
    };
    if (!checkoutKeyRef.current) {
      checkoutKeyRef.current = newIdempotencyKey();
    }
    const idempotencyKey = checkoutKeyRef.current;
    const isOnline = selectedPayment !== "cod";
    const paymentMethod = isOnline ? "online" : "cod";
    const paymentProvider = isOnline ? selectedPayment : undefined;

    const result = session
      ? await placeOrderFromCart({
          shippingAddress,
          couponCode: normalizedCoupon || undefined,
          paymentMethod,
          paymentProvider,
          idempotencyKey,
        })
      : await placeGuestOrder({
          items: cart.map((line) => ({
            productId: line.productId,
            qty: line.quantity,
            size: line.size,
          })),
          shippingAddress,
          customerEmail: values.email.trim(),
          couponCode: normalizedCoupon || undefined,
          paymentMethod,
          paymentProvider,
          idempotencyKey,
        });
    setPlacing(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    checkoutKeyRef.current = "";
    if (session) void refreshCart();
    else void clearCart();
    const query = session
      ? ""
      : result.lookupToken
        ? `?t=${encodeURIComponent(result.lookupToken)}`
        : "";

    if (!isOnline) {
      router.push(`/order-success/${result.order.id}${query}`);
      return;
    }

    setPaying(true);
    const payResult = await payOrder({
      orderNumber: result.order.id,
      lookupToken: result.lookupToken,
    });
    setPaying(false);

    if (payResult.status === "paid") {
      router.push(`/order-success/${result.order.id}${query}`);
      return;
    }

    const paymentSuffix = query ? "&payment=pending" : "?payment=pending";
    router.push(`/orders/${result.order.id}${query}${paymentSuffix}`);
  };

  if (!hydrated || !authHydrated) {
    return (
      <Container className="py-24 text-center">
        <p className="ap-eyebrow text-ink/40">Loading checkout&hellip;</p>
      </Container>
    );
  }

  if (cart.length === 0) {
    return (
      <Container className="py-20 sm:py-28">
        <div className="mx-auto max-w-md text-center">
          <p className="ap-eyebrow text-burnt">Your bag</p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)]">Nothing to check out</h1>
          <p className="ap-body mx-auto mt-4 max-w-sm text-ink/65">
            Your bag is empty. Add a piece or two and come back.
          </p>
          <Button href="/shop" variant="primary" size="md" withArrow className="mt-8">
            Browse everything
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-14">
      <div className="ap-anim-fade flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-5">
        <p className="ap-eyebrow flex items-center gap-3 text-burnt">
          <span aria-hidden="true" className="h-px w-8 bg-burnt/50" />
          Secure checkout
        </p>
        <p className="ap-eyebrow hidden text-ink/40 sm:block">{SITE.tagline}</p>
      </div>

      <div className="ap-anim-rise mt-7 flex flex-col gap-5 sm:mt-9 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)]">Checkout</h1>
          <p className="ap-body mt-3 max-w-lg text-ink/65">
            Delivery details, a quick review and you are done. A confirmation
            email follows the moment your order is placed.
          </p>
        </div>
        <p className="ap-eyebrow flex items-center gap-2 text-ink/45">
          <TruckIcon className="h-4 w-4 text-burnt" />
          Delivery across India &middot; 3&ndash;6 days
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16"
      >
        <div className="min-w-0">
          <section aria-labelledby="checkout-delivery-heading">
            <SectionHeading
              id="checkout-delivery-heading"
              step="01"
              title="Delivery details"
              description="We currently deliver across India. Please use the address where someone can receive the parcel during the day."
            />

            <div className="mt-7 grid gap-x-5 gap-y-6 sm:grid-cols-6">
              {FIELDS.map((field) => (
                <CheckoutField
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  error={errors[field.name]}
                  onChange={(value) => update(field.name, value)}
                />
              ))}
            </div>
          </section>

          <section
            aria-labelledby="checkout-payment-heading"
            className="mt-12 border-t border-line pt-10"
          >
            <SectionHeading
              id="checkout-payment-heading"
              step="02"
              title="Payment"
              description="Review your details and place the order when everything looks right."
            />

            <div className="mt-6 grid gap-3">
              {paymentMethods.map((method) => {
                const selected = selectedPayment === method;
                const label =
                  method === "razorpay"
                    ? "Pay online — UPI, cards, netbanking"
                    : method === "stripe"
                      ? "Pay by card (Stripe)"
                      : "Cash on delivery";
                const description =
                  method === "razorpay"
                    ? "UPI, cards, netbanking and wallets via Razorpay."
                    : method === "stripe"
                      ? "Secure card payment via Stripe."
                      : "Pay in cash when your parcel arrives. No card details are collected here.";
                return (
                  <label
                    key={method}
                    className={cn(
                      "flex cursor-pointer gap-4 border p-5 transition-colors",
                      selected
                        ? "border-burnt bg-burnt-900/20"
                        : "border-line bg-surface/70 hover:border-ash-400",
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={selected}
                      onChange={() => setSelectedPayment(method)}
                      className="mt-1.5 h-4 w-4 accent-burnt"
                    />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-floral text-burnt">
                      <LockIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-lg leading-snug">
                        {label}
                      </span>
                      <span className="ap-body mt-2 block text-sm text-ink/60">
                        {description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="ap-body mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-xs text-ink/55">
              <span className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-burnt/70" />
                Tracked delivery
              </span>
              <span className="flex items-center gap-2">
                <ReturnIcon className="h-4 w-4 text-burnt/70" />
                15-day returns
              </span>
              <span className="flex items-center gap-2">
                <GiftIcon className="h-4 w-4 text-burnt/70" />
                Gift wrap available
              </span>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-line bg-surface/70">
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl">Order summary</h2>
                <Link
                  href="/cart"
                  className="ap-eyebrow text-ink/45 transition-colors hover:text-burnt"
                >
                  Edit bag
                </Link>
              </div>
              <p className="ap-eyebrow mt-2 text-ink/40">{pluralize(cart.length, "item")}</p>
            </div>

            <ul className="divide-y divide-line px-5 sm:px-6">
              {cart.map((line) => (
                <li key={`${line.productId}-${line.size}`} className="flex gap-4 py-5">
                  <span className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden border border-line bg-floral">
                    <Image
                      src={productImageUrl(line.product, 0, { width: 180 })}
                      alt={line.product.name}
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 right-0 border-l border-t border-line bg-floral-900 px-1.5 py-0.5 text-[0.625rem] font-medium tabular-nums text-ink"
                    >
                      &times;{line.quantity}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-2 text-sm leading-snug text-ink">
                      {line.product.name}
                    </span>
                    <span className="ap-body mt-1 text-xs text-ink/50">
                      Size {line.size} &middot; Qty {line.quantity}
                    </span>
                    <span className="mt-auto flex items-baseline justify-between gap-3 pt-3">
                      {line.quantity > 1 ? (
                        <span className="ap-body text-xs text-ink/45">
                          {formatPrice(line.product.price)} each
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="shrink-0 text-sm tabular-nums text-ink">
                        {formatPrice(line.lineTotal)}
                      </span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-line px-5 py-5 sm:px-6">
              <label htmlFor="checkout-coupon" className="ap-eyebrow mb-2 block text-ink/55">
                Coupon code
              </label>
              <input
                id="checkout-coupon"
                name="couponCode"
                type="text"
                value={couponCode}
                onChange={(event) => updateCoupon(event.target.value)}
                maxLength={COUPON_CODE_MAX_LENGTH}
                autoComplete="off"
                placeholder="Enter a code"
                className="w-full border border-line bg-floral px-3.5 py-3 text-sm uppercase tracking-[0.08em] text-ink outline-none transition-colors placeholder:normal-case placeholder:tracking-normal placeholder:text-ink/30 hover:border-ash-400 focus:border-burnt"
              />
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "ap-body mt-2 text-xs",
                  couponError ? "text-burnt-400" : "text-ink/45",
                )}
              >
                {couponChecking
                  ? "Checking this code\u2026"
                  : couponError
                    ? couponError
                    : appliedCoupon
                      ? `Code applied \u2014 you save ${formatPrice(appliedCoupon.amount)}.`
                      : "Have an offer? Enter it here and we will apply it at checkout."}
              </p>
            </div>

            <dl className="ap-body flex flex-col gap-3 border-t border-line px-5 py-5 text-sm text-ink/65 sm:px-6">
              <div className="flex items-baseline justify-between gap-4">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-ink">{formatPrice(cartSubtotal)}</dd>
              </div>
              {normalizedCoupon && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="flex min-w-0 items-baseline gap-2">
                    <span>Coupon discount</span>
                    <span className="ap-eyebrow truncate text-burnt">{normalizedCoupon}</span>
                  </dt>
                  <dd
                    className={cn(
                      "shrink-0 text-right tabular-nums",
                      appliedCoupon ? "text-burnt" : "text-xs text-ink/50",
                    )}
                  >
                    {couponChecking
                      ? "Checking\u2026"
                      : appliedCoupon
                        ? `\u2212${formatPrice(discount)}`
                        : "\u2014"}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4">
                <dt>Shipping</dt>
                <dd className={shippingFree ? "text-ash-200" : "text-ink"}>
                  {shippingFree ? "Free" : formatPrice(shipping)}
                </dd>
              </div>
              {taxRatePercent > 0 && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt>Tax ({taxRatePercent}%)</dt>
                  <dd className="tabular-nums text-ink">{formatPrice(tax)}</dd>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="ap-eyebrow text-ink/55">
                  {appliedCoupon ? "Total" : "Estimated total"}
                </dt>
                <dd className="font-display text-2xl leading-none tabular-nums text-ink">
                  {formatPrice(total)}
                </dd>
              </div>
            </dl>

            {Object.keys(errors).length > 0 && (
              <div className="border-t border-line px-5 py-4 sm:px-6">
                <p className="ap-body text-xs text-burnt-400">
                  Please complete the highlighted delivery details above before
                  placing your order.
                </p>
              </div>
            )}

            {submitError && (
              <div className="border-t border-burnt/40 bg-burnt-900 px-5 py-4 sm:px-6">
                <p role="alert" className="ap-body text-sm text-burnt-200">
                  {submitError}
                </p>
              </div>
            )}

            <div className="border-t border-line px-5 py-5 sm:px-6">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                withArrow
                disabled={placing || paying}
                aria-busy={placing || paying}
              >
                {placing
                  ? "Placing order\u2026"
                  : paying
                    ? "Opening payment\u2026"
                    : `Place order \u2014 ${formatPrice(total)}`}
              </Button>

              <p className="ap-body mt-4 text-center text-xs text-ink/50">
                By placing this order you agree to our{" "}
                <Link href="/faq#terms" className="text-burnt underline underline-offset-4">
                  terms
                </Link>{" "}
                and{" "}
                <Link href="/faq#privacy" className="text-burnt underline underline-offset-4">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </div>
        </aside>
      </form>
    </Container>
  );
}
