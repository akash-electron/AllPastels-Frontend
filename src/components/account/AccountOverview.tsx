import Link from "next/link";
import type { ReactNode } from "react";
import { AccountCard, AccountPanel } from "@/components/account/AccountPanel";
import type { AccountSectionId } from "@/components/account/AccountNav";
import { OrderCard } from "@/components/account/AccountOrders";
import { Button } from "@/components/ui/Button";
import {
  ArrowRightIcon,
  BagIcon,
  MapPinIcon,
  ReturnIcon,
  TruckIcon,
} from "@/components/ui/icons";
import type { Address } from "@/types/address";
import type { OrderDetail } from "@/types/order";

/**
 * Overview — the panel a member lands on.
 *
 * Deliberately not a wall of statistics: it answers the three questions
 * that bring people to an account page (where is my order, what have I
 * saved, where does it go) and then hands off to the section that knows
 * more. Everything else on the page is one click from here.
 */

interface AccountOverviewProps {
  firstName: string;
  orders: OrderDetail[];
  addresses: Address[];
  ordersLoading?: boolean;
  ordersError?: string | null;
  addressesLoading?: boolean;
  addressesError?: string | null;
  onRetryOrders?: () => void;
  onRetryAddresses?: () => void;
  onSelect: (id: AccountSectionId) => void;
}

const QUICK_ACTIONS = [
  { href: "/faq#tracking", icon: TruckIcon, label: "Track a delivery", hint: "Follow a parcel that is on its way" },
  { href: "/shop", icon: BagIcon, label: "Continue shopping", hint: "The full range, all in one place" },
  { href: "/contact", icon: ReturnIcon, label: "Need help?", hint: "Returns, sizing and order queries" },
] as const;

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: (props: { className?: string }) => ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border border-line bg-surface/50 px-5 py-4 transition-colors duration-300 hover:border-ash-400 hover:bg-floral"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center border border-line bg-floral text-ash-300 transition-colors duration-300 group-hover:border-burnt group-hover:text-burnt">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ap-eyebrow block text-ink">{label}</span>
        <span className="mt-1 block truncate text-xs text-ink/50">{hint}</span>
      </span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-burnt" />
    </Link>
  );
}

export function AccountOverview({
  firstName,
  orders,
  addresses,
  ordersLoading = false,
  ordersError = null,
  addressesLoading = false,
  addressesError = null,
  onRetryOrders,
  onRetryAddresses,
  onSelect,
}: AccountOverviewProps) {
  const latestOrder = orders[0];
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  return (
    <AccountPanel
      id="account-overview"
      eyebrow="Overview"
      title={
        <>
          Welcome back, <em className="font-light italic text-burnt">{firstName}</em>.
        </>
      }
      action={
        <Button variant="ghost" size="sm" withArrow onClick={() => onSelect("orders")}>
          All orders
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Latest order — the reason most people open this page. */}
        <div className="lg:col-span-2">
          {ordersLoading ? (
            <AccountCard
              header={<p className="ap-eyebrow text-ink/45">Latest order</p>}
            >
              <p className="ap-eyebrow text-ink/40">Loading your orders…</p>
            </AccountCard>
          ) : ordersError ? (
            <AccountCard
              header={<p className="ap-eyebrow text-ink/45">Latest order</p>}
              footer={
                onRetryOrders ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    withArrow
                    className="w-full"
                    onClick={onRetryOrders}
                  >
                    Try again
                  </Button>
                ) : undefined
              }
            >
              <p role="alert" className="ap-body text-sm text-burnt">
                {ordersError}
              </p>
            </AccountCard>
          ) : latestOrder ? (
            <OrderCard order={latestOrder} label="Latest order" />
          ) : (
            <AccountCard
              header={<p className="ap-eyebrow text-ink/45">Latest order</p>}
              footer={
                <Button href="/shop" variant="outline" size="sm" withArrow className="w-full">
                  Start shopping
                </Button>
              }
            >
              <p className="ap-body text-sm text-ink/60">
                No orders yet — everything you buy will be listed here with its
                tracking details.
              </p>
            </AccountCard>
          )}
        </div>

        {/* Default address — where that order would go. */}
        <div>
          {addressesLoading ? (
            <AccountCard
              className="h-full"
              header={<p className="ap-eyebrow text-ink/45">Default address</p>}
            >
              <p className="ap-eyebrow text-ink/40">Loading addresses…</p>
            </AccountCard>
          ) : addressesError ? (
            <AccountCard
              className="h-full"
              header={<p className="ap-eyebrow text-ink/45">Default address</p>}
              footer={
                onRetryAddresses ? (
                  <button
                    type="button"
                    onClick={onRetryAddresses}
                    className="ap-eyebrow w-full text-left text-burnt transition-colors duration-300 hover:text-burnt-400"
                  >
                    Try again
                  </button>
                ) : undefined
              }
            >
              <p role="alert" className="ap-body text-sm text-burnt">
                {addressesError}
              </p>
            </AccountCard>
          ) : defaultAddress ? (
            <AccountCard
              className="h-full"
              header={
                <div className="flex items-center justify-between gap-3">
                  <p className="ap-eyebrow text-ink/45">Default address</p>
                  <MapPinIcon className="h-4 w-4 text-ash-300" />
                </div>
              }
              footer={
                <button
                  type="button"
                  onClick={() => onSelect("addresses")}
                  className="ap-eyebrow group flex w-full items-center justify-between gap-3 text-burnt transition-colors duration-300 hover:text-burnt-400"
                >
                  Manage addresses
                  <ArrowRightIcon className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              }
            >
              <p className="text-lg text-ink">
                {defaultAddress.label || "Saved address"}
              </p>
              <p className="ap-body mt-2 text-sm text-ink/65">
                {defaultAddress.fullName}
                <br />
                {[defaultAddress.line1, defaultAddress.line2]
                  .filter(Boolean)
                  .join(", ")}
                <br />
                {[
                  defaultAddress.city,
                  defaultAddress.state,
                  defaultAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
                <br />
                {defaultAddress.phone}
              </p>
            </AccountCard>
          ) : (
            <AccountCard
              className="h-full"
              header={<p className="ap-eyebrow text-ink/45">Default address</p>}
              footer={
                <button
                  type="button"
                  onClick={() => onSelect("addresses")}
                  className="ap-eyebrow w-full text-left text-burnt transition-colors duration-300 hover:text-burnt-400"
                >
                  Add an address
                </button>
              }
            >
              <p className="ap-body text-sm text-ink/60">
                Save a delivery address for a one-step checkout.
              </p>
            </AccountCard>
          )}
        </div>
      </div>

      {/* Follow-ups — the things a member is most likely to want next. */}
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <QuickAction key={action.href} {...action} />
        ))}
      </div>
    </AccountPanel>
  );
}
