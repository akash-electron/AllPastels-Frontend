"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { lookupOrder } from "@/api";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LockIcon } from "@/components/ui/icons";

export function TrackOrderClient() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    const result = await lookupOrder({
      orderNumber: orderNumber.trim().toUpperCase(),
      email: email.trim(),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(
      result.lookupToken
        ? `/orders/${encodeURIComponent(result.order.id)}?t=${encodeURIComponent(
            result.lookupToken,
          )}`
        : `/orders/${encodeURIComponent(result.order.id)}`,
    );
  };

  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <div>
          <p className="ap-eyebrow flex items-center gap-3 text-burnt">
            <span aria-hidden="true" className="h-px w-6 bg-burnt/50" />
            Order tracking
          </p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)]">
            Where is my order?
          </h1>
          <p className="ap-body mt-4 max-w-lg text-ink/65">
            Enter the order number from your confirmation email and the email
            address used at checkout. We will show the latest status and every
            saved update.
          </p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="track-order-number"
                className="ap-eyebrow mb-2 block text-ink/55"
              >
                Order number
              </label>
              <input
                id="track-order-number"
                name="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="AP-12345"
                autoComplete="off"
                inputMode="text"
                required
                className="w-full border border-line bg-floral px-3.5 py-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/30 hover:border-ash-400 focus:border-burnt"
              />
              <p className="ap-body mt-2 text-xs text-ink/45">
                It starts with AP- and has five digits.
              </p>
            </div>
            <div>
              <label
                htmlFor="track-order-email"
                className="ap-eyebrow mb-2 block text-ink/55"
              >
                Email address
              </label>
              <input
                id="track-order-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                required
                className="w-full border border-line bg-floral px-3.5 py-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/30 hover:border-ash-400 focus:border-burnt"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="border-l-2 border-burnt bg-burnt-900/30 px-3 py-2.5 text-sm text-burnt-200"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              withArrow
              disabled={pending}
              aria-busy={pending}
              className="self-start"
            >
              {pending ? "Looking up\u2026" : "Find my order"}
            </Button>
          </form>
        </div>

        <aside className="border border-line bg-surface/60 px-5 py-5 lg:self-start">
          <LockIcon className="h-5 w-5 text-burnt" />
          <h2 className="mt-3 text-lg">Your details stay private</h2>
          <p className="ap-body mt-2 text-sm text-ink/60">
            We only show an order when both the order number and the checkout
            email match. Signed-in customers can also see every order in their
            account.
          </p>
          <Button
            href="/account#orders"
            variant="outline"
            size="sm"
            withArrow
            className="mt-5"
          >
            Go to your account
          </Button>
        </aside>
      </div>
    </Container>
  );
}
