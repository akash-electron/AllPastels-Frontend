"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/data/categories";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { useCartDrawer } from "@/components/store/CartDrawerProvider";
import { useAuth } from "@/components/store/AuthProvider";
import { useStore } from "@/components/store/StoreProvider";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { initialsOf } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Navbar — compact three-zone header (brand / navigation / actions).
 *
 * Kept deliberately short (64px mobile, 72px desktop) so it never competes
 * with the hero for attention. Mobile collapses to hamburger / logo /
 * search / bag.
 */

export function Navbar() {
  const pathname = usePathname();
  const { cartCount, wishlist } = useStore();
  const { session } = useAuth();
  const { openCart } = useCartDrawer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close both overlays whenever the route changes. Adjusting state during
  // render (rather than in an effect) avoids a second render pass — this is
  // the pattern React recommends for "reset state when a prop changes".
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  // Add a hairline once the hero has scrolled away.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while an overlay is open.
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen, searchOpen]);

  // Escape closes whichever overlay is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-floral/95 backdrop-blur-md transition-colors duration-500",
          scrolled ? "border-line" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between gap-4 px-5 sm:h-[4.5rem] sm:px-8 lg:px-12">
          {/* Left — brand */}
          <div className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-ml-2 flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70 lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <MenuIcon className="h-6 w-6" />
            </button>

            <Link
              href="/"
              className="group inline-flex items-baseline"
              aria-label="AllPastels — home"
            >
              <span className="font-display text-[1.4rem] leading-none tracking-[0.16em] text-ink transition-colors duration-500 group-hover:text-burnt sm:text-[1.5rem]">
                ALL
              </span>
              <span className="font-display text-[1.4rem] leading-none tracking-[0.16em] text-burnt sm:text-[1.5rem]">
                PASTELS
              </span>
            </Link>
          </div>


          {/* Centre — primary navigation */}
          <nav className="hidden lg:block" aria-label="Primary">
            <ul className="flex items-center gap-9">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "ap-eyebrow relative py-2 transition-colors duration-300",
                      isActive(link.href) ? "text-burnt" : "text-ink hover:text-burnt",
                    )}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-0 bottom-0 h-px origin-left bg-burnt transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isActive(link.href) ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right — actions */}
          <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
              aria-label="Search products"
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            <Link
              href={session ? "/account#profile" : "/account"}
              className="hidden h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70 sm:flex"
              aria-label={session ? `Your profile, signed in as ${session.name}` : "Sign in or create an account"}
            >
              {/* Signed in: the monogram replaces the generic icon so the
                  header reflects the session at a glance. */}
              {session ? (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-t-full rounded-b-md bg-burnt pt-0.5 text-[0.5625rem] font-medium leading-none text-floral-900"
                  aria-hidden="true"
                >
                  {initialsOf(session.name)}
                </span>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </Link>

            <Link
              href="/wishlist"
              className="relative flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
              aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} items` : ""}`}
            >
              <HeartIcon className="h-5 w-5" />
              {wishlist.length > 0 && (
                <span className="absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cotton px-1 text-[0.5625rem] font-medium leading-none text-ink">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Opens the bag panel rather than navigating: browsing stays
                uninterrupted. The full bag page is still reachable from the
                panel's "View cart" action. */}
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-11 w-11 items-center justify-center text-ink transition-opacity hover:opacity-70"
              aria-label={`Open bag${cartCount ? `, ${cartCount} items` : ""}`}
              aria-haspopup="dialog"
            >
              <BagIcon className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-burnt px-1 text-[0.5625rem] font-medium leading-none text-floral-900">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
