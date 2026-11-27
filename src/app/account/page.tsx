import type { Metadata } from "next";
import { AccountPage } from "@/components/account/AccountPage";

export const metadata: Metadata = {
  title: "My Account",
  description: "Your AllPastels account — profile, orders, saved addresses and wishlist.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <AccountPage />;
}
