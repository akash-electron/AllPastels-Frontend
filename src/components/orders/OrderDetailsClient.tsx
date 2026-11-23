"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrder, lookupOrder } from "@/api";
import { OrderReceipt } from "@/components/orders/OrderReceipt";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { OrderDetail } from "@/types/order";

export function OrderDetailsClient({
  orderNumber,
  token,
  payment,
}: {
  orderNumber: string;
  token?: string;
  payment?: string;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = token
      ? await lookupOrder({ orderNumber, token })
      : await getOrder(orderNumber);
    if (result.ok) {
      setOrder(result.order);
      setResolvedToken(result.lookupToken ?? token);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [token, orderNumber]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <Container className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl" aria-busy="true">
          <div className="h-12 w-56 animate-pulse rounded-sm bg-line" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-96 animate-pulse rounded-sm bg-line" />
            <div className="h-64 animate-pulse rounded-sm bg-line" />
          </div>
        </div>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container className="py-20 sm:py-28">
        <div className="mx-auto max-w-lg text-center">
          <p className="ap-eyebrow text-burnt">Order lookup</p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)]">
            We could not show this order
          </h1>
          <p role="alert" className="ap-body mx-auto mt-4 max-w-md text-ink/65">
            {error ??
              "Sign in with the account used to order, or look it up with the email used at checkout."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/track-order" variant="primary" size="md" withArrow>
              Look up your order
            </Button>
            <Button href="/account#orders" variant="outline" size="md" withArrow>
              Go to your account
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <OrderReceipt
      order={order}
      lookupToken={resolvedToken}
      payment={payment}
      onReload={load}
    />
  );
}