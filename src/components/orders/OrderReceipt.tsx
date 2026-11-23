"use client";

import Link from "next/link";
import { useState } from "react";
import {
  OrderLines,
  OrderStatusPill,
  formatOrderDate,
} from "@/components/account/AccountOrders";
import { Button } from "@/components/ui/Button";
import { CheckIcon, TruckIcon } from "@/components/ui/icons";
import { formatPrice, pluralize } from "@/lib/utils";
import { payOrder } from "@/lib/pay-order";
import type {
  OrderDetail,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/types/order";

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Pending",
  confirmed: "Confirmed",
  processing: "Packing",
  shipped: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};

function paymentMethodLabel(method: OrderPaymentMethod): string {
  return method === "online" ? "Online payment" : "Cash on delivery";
}

function paymentStatusLabel(status: OrderPaymentStatus): string {
  return {
    pending: "Payment pending",
    paid: "Paid",
    failed: "Payment failed",
    refunded: "Refunded",
  }[status];
}

export function OrderReceipt({
  order,
  celebrate = false,
  lookupToken,
  payment,
  onReload,
}: {
  order: OrderDetail;
  celebrate?: boolean;
  lookupToken?: string;
  payment?: string;
  onReload?: () => void | Promise<void>;
}) {
  const firstName = order.customerName?.trim().split(/\s+/)[0] || "";
  const [paying, setPaying] = useState(false);
  const timeline =
    order.statusHistory.length > 0
      ? order.statusHistory
      : [{ status: order.status, at: order.placedOn }];
  const handlePayNow = async () => {
    setPaying(true);
    const result = await payOrder({ orderNumber: order.id, lookupToken });
    setPaying(false);
    if (result.status === "paid") {
      if (onReload) await onReload();
      else window.location.reload();
    }
  };

  const detailsHref = lookupToken
    ? `/orders/${encodeURIComponent(order.id)}?t=${encodeURIComponent(
        lookupToken,
      )}`
    : `/orders/${encodeURIComponent(order.id)}`;

  return (
    <div className="pb-16 pt-10 sm:pb-20 sm:pt-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {payment === "pending" || payment === "cancelled" ? (
          <div className="mb-6 border border-burnt/40 bg-burnt-900/30 px-5 py-4 text-sm text-burnt-200">
            Your payment didn&apos;t go through. Your order is saved — you can
            pay now.
          </div>
        ) : null}
        {celebrate ? (
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-burnt/30 bg-burnt-900 text-burnt-400">
              <CheckIcon className="h-7 w-7" />
            </span>
            <p className="ap-eyebrow mt-7 flex items-center justify-center gap-3 text-burnt">
              <span aria-hidden="true" className="h-px w-6 bg-burnt/50" />
              Order confirmed
            </p>
            <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)]">
              Thank you{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="ap-body mx-auto mt-4 max-w-md text-ink/65">
              We have received order{" "}
              <span className="text-ink">{order.id}</span>
              {order.customerEmail ? (
                <>
                  {" "}
                  and sent the confirmation to {order.customerEmail}
                </>
              ) : null}
              . We will be in touch when it ships.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/shop" variant="primary" size="md" withArrow>
                Continue shopping
              </Button>
              <Button
                href={detailsHref}
                variant="outline"
                size="md"
                withArrow
              >
                View order details
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <p className="ap-eyebrow flex items-center gap-3 text-burnt">
                <span aria-hidden="true" className="h-px w-6 bg-burnt/50" />
                Order details
              </p>
              <h1 className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)]">
                {order.id}
              </h1>
              <p className="ap-body mt-2 text-sm text-ink/60">
                Placed {formatOrderDate(order.placedOn)} &middot;{" "}
                {pluralize(order.itemCount, "item")}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <OrderStatusPill status={order.status} />
              <Button href="/shop" variant="outline" size="sm" withArrow>
                Continue shopping
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <section
              aria-labelledby="order-items-heading"
              className="border border-line bg-surface/50"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                <h2 id="order-items-heading" className="text-xl">
                  Your pieces
                </h2>
                <span className="ap-eyebrow text-ink/45">
                  {pluralize(order.itemCount, "item")}
                </span>
              </div>
              <OrderLines order={order} skipFirstRule />
              <dl className="ap-body flex flex-col gap-2.5 border-t border-line px-5 py-5 text-sm text-ink/65">
                <div className="flex justify-between gap-4">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums text-ink">
                    {formatPrice(order.subtotal)}
                  </dd>
                </div>
                {order.discount > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt>
                      Discount
                      {order.coupon ? ` (${order.coupon.code})` : ""}
                    </dt>
                    <dd className="tabular-nums text-burnt">
                      &minus;{formatPrice(order.discount)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt>Shipping</dt>
                  <dd className="text-ink">
                    {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Tax</dt>
                  <dd className="tabular-nums text-ink">
                    {formatPrice(order.tax)}
                  </dd>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="ap-eyebrow text-ink/55">Total</dt>
                  <dd className="font-display text-2xl leading-none tabular-nums text-ink">
                    {formatPrice(order.total)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-6 border border-line bg-surface/50">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-xl">Track your order</h2>
              </div>
              <ol className="px-5 py-5">
                {timeline.map((entry, index) => (
                  <li
                    key={`${entry.status}-${entry.at}-${index}`}
                    className="relative flex gap-4 pb-5 last:pb-0"
                  >
                    <span className="relative flex w-4 shrink-0 justify-center">
                      {index < timeline.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className="absolute top-3 h-full w-px bg-line"
                        />
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full border border-burnt bg-floral"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">
                        {STATUS_LABELS[entry.status]}
                      </span>
                      <span className="ap-body mt-0.5 block text-xs text-ink/50">
                        {formatOrderDate(entry.at)}
                        {entry.note ? ` — ${entry.note}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            <section className="border border-line bg-surface/50 px-5 py-5">
              <h2 className="ap-eyebrow text-ink/55">Delivery address</h2>
              {order.shippingAddress ? (
                <address className="ap-body mt-3 text-sm not-italic leading-relaxed text-ink/75">
                  <span className="block font-medium text-ink">
                    {order.shippingAddress.fullName}
                  </span>
                  <span className="block">{order.shippingAddress.line1}</span>
                  {order.shippingAddress.line2 ? (
                    <span className="block">{order.shippingAddress.line2}</span>
                  ) : null}
                  <span className="block">
                    {order.shippingAddress.city}
                    {order.shippingAddress.state
                      ? `, ${order.shippingAddress.state}`
                      : ""}{" "}
                    {order.shippingAddress.postalCode}
                  </span>
                  <span className="block">{order.shippingAddress.country}</span>
                  {order.shippingAddress.phone ? (
                    <span className="mt-2 block text-ink/55">
                      {order.shippingAddress.phone}
                    </span>
                  ) : null}
                </address>
              ) : (
                <p className="ap-body mt-3 text-sm text-ink/55">
                  No delivery address was supplied with this order.
                </p>
              )}
            </section>

            <section className="border border-line bg-surface/50 px-5 py-5">
              <h2 className="ap-eyebrow text-ink/55">Payment</h2>
              <dl className="ap-body mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/55">Method</dt>
                  <dd className="text-ink">
                    {paymentMethodLabel(order.paymentMethod)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/55">Status</dt>
                  <dd className="text-ink">
                    {paymentStatusLabel(order.paymentStatus)}
                  </dd>
                </div>
                {order.customerEmail ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/55">Email</dt>
                    <dd className="min-w-0 truncate text-right text-ink">
                      {order.customerEmail}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {order.paymentMethod === "online" &&
              (order.paymentStatus === "pending" ||
                order.paymentStatus === "failed") &&
              order.status === "placed" ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="mt-4 w-full"
                  disabled={paying}
                  onClick={() => void handlePayNow()}
                >
                  {paying ? "Opening payment\u2026" : "Pay now"}
                </Button>
              ) : null}
            </section>

            <section className="border border-line bg-floral px-5 py-5">
              <TruckIcon className="h-5 w-5 text-burnt" />
              <h2 className="mt-3 text-lg">Need a hand?</h2>
              <p className="ap-body mt-2 text-sm text-ink/60">
                Reply to your confirmation email or contact the boutique with
                your order number and we will help.
              </p>
              <Link
                href="/contact"
                className="ap-eyebrow mt-4 inline-block text-burnt underline-offset-4 hover:underline"
              >
                Contact us
              </Link>
            </section>

            <p className="ap-body text-xs text-ink/45">
              Keep your order number safe. Guests can look it up any time with
              the email used at checkout.
            </p>
            <Button href="/track-order" variant="outline" size="sm" withArrow>
              Track another order
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
