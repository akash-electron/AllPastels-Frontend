import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AccountCard, AccountPanel } from "@/components/account/AccountPanel";
import type { Session } from "@/components/store/AuthProvider";
import { Button } from "@/components/ui/Button";
import { LockIcon, SettingsIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Settings â€” notification preferences and the session.
 *
 * Preferences are the one genuinely stateful part of the account beyond
 * the cart: they persist to localStorage under a single key, so the
 * switches keep their position across visits instead of being decorative.
 * Profile details live in their own section so the two concerns stay clear.
 */

interface AccountSettingsProps {
  session: Session;
  joined: string;
  onSignOut: () => void;
}

type NotificationPrefs = {
  orderUpdates: boolean;
  dropAlerts: boolean;
  restockAlerts: boolean;
};

const PREFS_KEY = "allpastels.prefs";

const DEFAULT_PREFS: NotificationPrefs = {
  orderUpdates: true,
  dropAlerts: true,
  restockAlerts: false,
};

const PREF_ROWS: Array<{
  key: keyof NotificationPrefs;
  label: string;
  hint: string;
}> = [
  {
    key: "orderUpdates",
    label: "Order updates",
    hint: "Dispatch, delivery and returns, sent by email.",
  },
  {
    key: "dropAlerts",
    label: "New drops & edits",
    hint: "Seasonal launches and small-run restocks, first.",
  },
  {
    key: "restockAlerts",
    label: "Back-in-stock alerts",
    hint: "When a piece you saved is available again.",
  },
];

/** Reads the stored switches, falling back to the defaults per missing key. */
function readPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<NotificationPrefs>) : {};
    return { ...DEFAULT_PREFS, ...stored };
  } catch {
    return DEFAULT_PREFS;
  }
}

function Toggle({
  on,
  onChange,
  labelledBy,
}: {
  on: boolean;
  onChange: () => void;
  labelledBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={onChange}
      className={cn(
        "flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-300",
        on ? "justify-end border-burnt bg-burnt" : "justify-start border-ash-700 bg-ash-700",
      )}
    >
      <span
        aria-hidden="true"
        className="block h-4 w-4 rounded-full bg-floral transition-colors duration-300"
      />
    </button>
  );
}

function SettingsGroupHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: (props: { className?: string }) => ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-floral text-ash-300">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="ap-eyebrow text-ink">{title}</p>
        <p className="mt-1 truncate text-xs text-ink/50">{hint}</p>
      </div>
    </div>
  );
}

export function AccountSettings({ session, joined, onSignOut }: AccountSettingsProps) {
  // Read on first render: this panel only mounts behind the session gate,
  // which never renders during SSR or hydration, so there is no server
  // snapshot to reconcile the stored value against.
  const [prefs, setPrefs] = useState<NotificationPrefs>(readPrefs);

  // Persist on every change. The mount-time run only rewrites what was
  // just read, which keeps storage and state on the same shape.
  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Private mode or a full quota â€” the switches still work in memory.
    }
  }, [prefs]);


  return (
    <AccountPanel
      id="account-settings"
      eyebrow="Settings"
      title="Preferences & session"
    >
      <div className="flex flex-col gap-5">
        <AccountCard
          header={
            <SettingsGroupHeader
              icon={SettingsIcon}
              title="Notifications"
              hint="Choose what lands in your inbox"
            />
          }
        >
          <ul>
            {PREF_ROWS.map((row) => {
              const rowId = `pref-${row.key}`;

              return (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-6 border-t border-line py-4 first:border-t-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p id={rowId} className="text-sm text-ink">
                      {row.label}
                    </p>
                    <p className="ap-body mt-1 text-xs text-ink/55">{row.hint}</p>
                  </div>

                  <Toggle
                    on={prefs[row.key]}
                    labelledBy={rowId}
                    onChange={() =>
                      setPrefs({ ...prefs, [row.key]: !prefs[row.key] })
                    }
                  />
                </li>
              );
            })}
          </ul>
        </AccountCard>

        <AccountCard
          header={
            <SettingsGroupHeader
              icon={LockIcon}
              title="Session"
              hint="Signed in on this device"
            />
          }
          footer={
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSignOut}
              >
                Sign out
              </Button>
            </div>
          }
        >

<p className="ap-body text-sm text-ink/65">
  You are signed in as{" "}
  <span className="text-ink">
    {session.email ?? session.phone}
  </span>
  {joined ? ` and have been a member since ${joined}` : ""}.
  Signing out ends this session on this device â€” your bag and saved
  pieces stay right where they are.
</p>

        </AccountCard>
      </div>
    </AccountPanel>
  );
}
