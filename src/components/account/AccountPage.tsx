"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_SECTIONS,
  AccountNavRail,
  AccountSidebar,
  isAccountSection,
} from "@/components/account/AccountNav";
import type {
  AccountSectionId,
  AccountSectionItem,
} from "@/components/account/AccountNav";
import { AccountAddresses } from "@/components/account/AccountAddresses";
import { AccountOrders } from "@/components/account/AccountOrders";
import { AccountOverview } from "@/components/account/AccountOverview";
import { AccountSettings } from "@/components/account/AccountSettings";
import { AccountWishlist } from "@/components/account/AccountWishlist";
import { SignedOutGate } from "@/components/account/SignedOutGate";
import { useAuth } from "@/components/store/AuthProvider";
import { useStore } from "@/components/store/StoreProvider";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getMyOrders } from "@/api";
import { getAddresses } from "@/lib/account-data";
import { initialsOf } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { OrderDetail } from "@/types/order";

/**
 * AccountPage — the signed-in dashboard (and the gate shown without a
 * session).
 *
 * Shape: a profile header carrying identity and the three numbers people
 * come here for, then a sticky section navigation beside whichever section
 * is open. Sections are client state rather than routes, so switching
 * never leaves the page — but the selection is mirrored into the URL hash
 * so a section can still be linked and survives a refresh.
 *
 * Orders load from the backend through the orders service; saved addresses
 * still come from `account-data.ts` until that module is integrated.
 */

export function AccountPage() {
  const { session, hydrated, signOut } = useAuth();
  const { wishlist, hydrated: storeHydrated } = useStore();
  const router = useRouter();

  // Deep links: /account#orders opens straight on that section. Read during
  // the first render rather than in an effect — this component renders the
  // loading state on the server and during hydration, so the value is never
  // part of the markup React has to reconcile.
  const [section, setSection] = useState<AccountSectionId>(() => {
    if (typeof window === "undefined") return "overview";
    const hash = window.location.hash.replace(/^#/, "");
    return isAccountSection(hash) ? hash : "overview";
  });
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setOrdersLoading(true);
    setOrdersError(null);
    const result = await getMyOrders();
    if (result.ok) {
      setOrders(result.orders);
    } else if (!silent) {
      setOrders([]);
      setOrdersError(result.error);
    }
    if (!silent) setOrdersLoading(false);
  }, []);

  const handleOrderCancelled = useCallback(
    (updated: OrderDetail) => {
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
      void loadOrders({ silent: true });
    },
    [loadOrders],
  );

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session, loadOrders]);

  if (!hydrated || !storeHydrated) return <AccountLoading />;

  if (!session) return <SignedOutGate />;

  const addresses = getAddresses();
  const firstName = session.name.split(/\s+/)[0] || session.name;
  const joined = new Date(session.joinedAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const counts: Partial<Record<AccountSectionId, number>> = {
    orders: orders.length,
    wishlist: wishlist.length,
    addresses: addresses.length,
  };
  const items: AccountSectionItem[] = ACCOUNT_SECTIONS.map((item) => ({
    ...item,
    count: counts[item.id],
  }));

  const selectSection = (id: AccountSectionId) => {
    setSection(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  const stats = [
    { label: "Orders", value: orders.length },
    { label: "Saved", value: wishlist.length },
    { label: "Addresses", value: addresses.length },
  ];

  return (
    <section className="pb-16 pt-10 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-14">
      <Container>
        {/* ---------------------------------------------- Profile header */}
        <header className="ap-anim-rise border border-line bg-surface/60">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex min-w-0 items-center gap-5 sm:gap-6">
              <span
                aria-hidden="true"
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-line bg-floral font-display text-2xl text-burnt sm:h-20 sm:w-20 sm:text-[1.75rem]"
              >
                {initialsOf(session.name)}
              </span>

              <div className="min-w-0">
                <p className="ap-eyebrow flex items-center gap-3 text-burnt">
                  <span aria-hidden="true" className="h-px w-6 bg-burnt/50" />
                  Your account
                </p>
                <h1 className="mt-2.5 text-[clamp(1.75rem,4vw,2.5rem)]">
                  Hello, <em className="font-light italic text-burnt">{firstName}</em>.
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p className="ap-body min-w-0 truncate text-sm text-ink/60">
                    {session.email ?? session.phone}
                  </p>
                  <span aria-hidden="true" className="hidden h-3 w-px bg-line sm:block" />
                  <p className="ap-eyebrow text-ink/45">Member since {joined}</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Button href="/shop" variant="outline" size="sm" withArrow>
                Continue shopping
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-3 border-t border-line">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "px-4 py-4 sm:px-7 sm:py-5",
                  index > 0 && "border-l border-line",
                )}
              >
                <dt className="text-xs text-ink/50">{stat.label}</dt>
                <dd className="mt-1.5 font-display text-2xl leading-none text-ink sm:text-[1.75rem]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        {/* Mobile section rail */}
        <AccountNavRail items={items} active={section} onSelect={selectSection} />

        {/* ------------------------------------------ Nav + active panel */}
        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
          <AccountSidebar items={items} active={section} onSelect={selectSection} />

          <div className="min-w-0">
            {/* Re-mounting on a section change plays the entrance once. */}
            <div
              key={section}
              className="ap-anim-rise"
              style={{ animationDuration: "520ms" }}
            >
              {section === "overview" && (
                <AccountOverview
                  firstName={firstName}
                  orders={orders}
                  addresses={addresses}
                  ordersLoading={ordersLoading}
                  ordersError={ordersError}
                  onRetryOrders={loadOrders}
                  onSelect={selectSection}
                />
              )}
              {section === "orders" && (
                <AccountOrders
                  orders={orders}
                  loading={ordersLoading}
                  error={ordersError}
                  onRetry={loadOrders}
                  onOrderCancelled={handleOrderCancelled}
                />
              )}
              {section === "wishlist" && <AccountWishlist />}
              {section === "addresses" && <AccountAddresses addresses={addresses} />}
              {section === "settings" && (
                <AccountSettings
                  session={session}
                  joined={joined}
                  onSignOut={handleSignOut}
                />
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function AccountLoading() {
  return (
    <div className="flex min-h-[45svh] flex-col items-center justify-center gap-4 py-24 text-center">
      <span aria-hidden="true" className="h-px w-16 bg-line" />
      <p className="ap-eyebrow text-ink/45">Loading your account…</p>
    </div>
  );
}
