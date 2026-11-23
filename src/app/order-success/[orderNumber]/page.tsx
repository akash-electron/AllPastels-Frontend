import type { Metadata } from "next";
import { OrderSuccessClient } from "@/components/orders/OrderSuccessClient";

export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your AllPastels order confirmation.",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string | string[]; session_id?: string | string[] }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const t = Array.isArray(query.t) ? query.t[0] : query.t;
  const sessionId = Array.isArray(query.session_id)
    ? query.session_id[0]
    : query.session_id;
  return (
    <OrderSuccessClient orderNumber={orderNumber} token={t} sessionId={sessionId} />
  );
}
