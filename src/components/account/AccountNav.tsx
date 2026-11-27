import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  BagIcon,
  EditIcon,
  HeartIcon,
  MapPinIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Account navigation — one item model, two presentations.
 *
 * The sidebar carries the desktop dashboard (sticky, with counts and a
 * support card beneath it); the rail is the phone version of exactly the
 * same list, scrollable so every section stays reachable on one row. Because
 * both read from `ACCOUNT_SECTIONS`, the two can never drift apart.
 */

export type AccountSectionId =
  | "overview"
  | "profile"
  | "orders"
  | "wishlist"
  | "addresses"
  | "settings";

export interface AccountSectionItem {
  id: AccountSectionId;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  /** Optional badge — populated with live counts by the page. */
  count?: number;
}

export const ACCOUNT_SECTIONS: AccountSectionItem[] = [
  { id: "overview", label: "Account overview", icon: UserIcon },
  { id: "profile", label: "Profile", icon: EditIcon },
  { id: "orders", label: "Orders", icon: BagIcon },
  { id: "wishlist", label: "Wishlist", icon: HeartIcon },
  { id: "addresses", label: "Addresses", icon: MapPinIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function isAccountSection(value: string): value is AccountSectionId {
  return ACCOUNT_SECTIONS.some((section) => section.id === value);
}

interface NavProps {
  items: AccountSectionItem[];
  active: AccountSectionId;
  onSelect: (id: AccountSectionId) => void;
}

function NavIcon({
  item,
  isActive,
  variant = "tile",
}: {
  item: AccountSectionItem;
  isActive: boolean;
  /** `tile` frames the icon (sidebar); `plain` keeps it bare (rail). */
  variant?: "tile" | "plain";
}) {
  const Icon = item.icon;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center transition-colors duration-300",
        variant === "tile"
          ? cn(
              "h-9 w-9 border",
              isActive
                ? "border-burnt bg-floral text-burnt"
                : "border-line bg-floral text-ash-300 group-hover:border-ash-400 group-hover:text-ink",
            )
          : cn("h-7 w-7", isActive ? "text-burnt" : "text-ash-300"),
      )}
    >
      <Icon className={variant === "tile" ? "h-5 w-5" : "h-4 w-4"} />
    </span>
  );
}

/**
 * Desktop sidebar — sticky beside the content so the sections stay one
 * click away however long an order history grows.
 */
export function AccountSidebar({ items, active, onSelect }: NavProps) {
  return (
    <aside className="hidden self-start lg:sticky lg:top-28 lg:block">
      <nav aria-label="Account sections" className="border border-line bg-floral">
        <p className="ap-eyebrow px-6 pb-5 pt-6 text-ink/40">Menu</p>

        <ul className="border-t border-line">
          {items.map((item) => {
            const isActive = item.id === active;

            return (
              <li key={item.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-300",
                    isActive ? "bg-burnt-900" : "hover:bg-surface",
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-0.5 bg-burnt"
                    />
                  )}

                  <NavIcon item={item} isActive={isActive} />

                  <span
                    className={cn(
                      "ap-eyebrow",
                      isActive ? "text-ink" : "text-ink/65 group-hover:text-ink",
                    )}
                  >
                    {item.label}
                  </span>

                  {item.count !== undefined && (
                    <span
                      className={cn(
                        "ml-auto text-xs tabular-nums",
                        isActive ? "text-ink/50" : "text-ink/35",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Support card — the sidebar's second job: reassurance, not navigation. */}
      <div className="mt-5 border border-line bg-surface/60 p-5">
        <p className="ap-eyebrow text-ink/45">Need a hand?</p>
        <p className="ap-body mt-2 text-xs text-ink/60">
          Our stylists reply within a day, Monday to Saturday.
        </p>
        <Button href="/contact" variant="outline" size="sm" withArrow className="mt-4 w-full">
          Contact us
        </Button>
      </div>
    </aside>
  );
}

/**
 * Phone rail — the same sections as a swipeable row of pills, bleeding to
 * the screen edge so it reads as a rail rather than a wrapped button group.
 */
export function AccountNavRail({ items, active, onSelect }: NavProps) {
  return (
    <nav
      aria-label="Account sections"
      className="-mx-5 mt-6 px-5 sm:-mx-8 sm:px-8 lg:hidden"
    >
      <ul className="ap-scroll-x flex gap-2.5">
        {items.map((item) => {
          const isActive = item.id === active;

          return (
            <li key={item.id} className="ap-snap-start shrink-0">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap border px-4 py-3 transition-colors duration-300",
                  isActive ? "border-burnt bg-burnt-900" : "border-line bg-floral hover:bg-surface",
                )}
              >
                <NavIcon item={item} isActive={isActive} variant="plain" />
                <span
                  className={cn(
                    "ap-eyebrow",
                    isActive ? "text-ink" : "text-ink/65",
                  )}
                >
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isActive ? "text-ink/50" : "text-ink/35",
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
