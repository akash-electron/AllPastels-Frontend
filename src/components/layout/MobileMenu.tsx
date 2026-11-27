"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { navLinks } from "@/data/categories";
import { useAuth } from "@/components/store/AuthProvider";
import { useStore } from "@/components/store/StoreProvider";
import { ArrowRightIcon, CloseIcon, HeartIcon, UserIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * MobileMenu — full-height navigation drawer.
 *
 * Slides in from the left, traps focus while open, and closes on route
 * change. Secondary links (help, about) sit below the primary nav so the
 * shopping categories always come first on a phone.
 */

const secondaryLinks = [
  { label: "About AllPastels", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Frequently Asked Questions", href: "/faq" },
  { label: "Track Order", href: "/faq#tracking" },
];

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { wishlist } = useStore();
  const { session } = useAuth();

  // Move focus into the drawer when it opens, and return it on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Scrim */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full animate-[ap-fade_300ms_ease-out] bg-ash-100/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="ap-anim-slide-left absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-floral shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="font-display text-lg tracking-[0.16em]">
            <span className="text-ink">ALL</span>
            <span className="text-burnt">PASTELS</span>
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
            aria-label="Close menu"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-5 py-6" aria-label="Mobile">
          <ul className="flex flex-col">
            {navLinks.map((link, index) => (
              <li key={link.href} className="border-b border-line/70 last:border-b-0">
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="group flex items-center justify-between py-4 font-display text-2xl text-ink transition-colors duration-300 hover:text-burnt"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {link.label}
                  <ArrowRightIcon className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href={session ? "/account#profile" : "/account"}
            onClick={onClose}
            className="mt-8 flex items-center gap-3 text-ink"
          >
            <UserIcon className="h-5 w-5" />
            <span className="ap-eyebrow">
              {session ? `Profile · ${session.name.split(/\s+/)[0]}` : "Sign in / Join"}
            </span>
          </Link>

          <Link
            href="/wishlist"
            onClick={onClose}
            className="mt-5 flex items-center gap-3 text-ink"
          >
            <HeartIcon className="h-5 w-5" filled={wishlist.length > 0} />
            <span className="ap-eyebrow">
              Wishlist{wishlist.length > 0 ? ` (${wishlist.length})` : ""}
            </span>
          </Link>
        </nav>

        <div className="border-t border-line bg-surface px-5 py-5">
          <p className="ap-eyebrow mb-3 text-ink/40">Help</p>
          <ul className="flex flex-col gap-2.5">
            {secondaryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="ap-body text-sm text-ink/70 transition-colors hover:text-burnt"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn("px-5 py-5")}>
          <p className="ap-body text-xs text-ink/60">
            Questions? Write to{" "}
            <a href="mailto:care@allpastels.com" className="text-burnt underline underline-offset-4">
              care@allpastels.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
