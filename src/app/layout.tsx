import type { Metadata, Viewport } from "next";
import { Fraunces, Jost } from "next/font/google";
import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SurpriseOffer } from "@/components/layout/SurpriseOffer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartDrawerProvider } from "@/components/store/CartDrawerProvider";
import { AuthProvider } from "@/components/store/AuthProvider";
import { StoreProvider } from "@/components/store/StoreProvider";
import { SITE } from "@/data/site";
import "./globals.css";

/**
 * Typography
 * Fraunces — a warm, high-contrast serif with an optical-size axis, used
 * for all display type. Its `SOFT` axis gives the editorial voice without
 * feeling severe.
 * Jost — a geometric sans with generous spacing, used for navigation, body
 * copy and product information.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "AllPastels",
    "modern fashion",
    "everyday clothing",
    "linen",
    "merino",
    "D2C fashion",
    "Indian fashion brand",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE.url,
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
    lang="en"
    className={`${fraunces.variable} ${jost.variable} h-full antialiased`}
    // Marks that JavaScript is running, which is what allows the reveal
    // animations to hide content before animating it in. Without this class
    // every element stays visible, so a failed or blocked script can never
    // leave the page blank.
    suppressHydrationWarning
  >
      <head>
        {/*
          Runs before first paint, so the hidden reveal state is applied in
          the same frame the content is laid out — no flash of visible
          content followed by a snap-back to hidden.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js-reveal')",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-floral focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to main content
        </a>
        <StoreProvider>
          {/* Session state sits in its own provider so the navbar, menu and
              account screens can read it without touching commerce data. */}
          <AuthProvider>
            {/* The bag panel's open flag lives in its own tiny provider, so the
                commerce store stays purely data and the Navbar can raise the
                panel without prop-drilling through the tree. */}
            <CartDrawerProvider>
              {/* Announcements sit above the sticky navbar and scroll away. */}
              <AnnouncementBar />
              <Navbar />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
              <CartDrawer />
              {/* First-visit welcome coupon — remembered once it has been seen. */}
              <SurpriseOffer />
            </CartDrawerProvider>
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

