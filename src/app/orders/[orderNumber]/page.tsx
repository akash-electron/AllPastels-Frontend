import type { Metadata } from "next";
import { OrderDetailsClient } from "@/components/orders/OrderDetailsClient";

export const metadata: Metadata = {
  title: "Order details",
  description: "Track and review your AllPastels order.",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string | string[]; payment?: string | string[] }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const t = Array.isArray(query.t) ? query.t[0] : query.t;
  const payment = Array.isArray(query.payment) ? query.payment[0] : query.payment;
  return (
    <OrderDetailsClient orderNumber={orderNumber} token={t} payment={payment} />
  );
}
