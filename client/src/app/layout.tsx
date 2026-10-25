import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { Cursor } from "@/components/layout/Cursor";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { themeScript } from "@/components/layout/Theme";
import { Toaster } from "@/components/ui/Toaster";
import { dmSans, fraunces } from "./fonts";
import "@/styles/globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "caketown · Fresh baked happiness, delivered",
    template: "%s · caketown",
  },
  description:
    "Cakes made to order, breads and pastries baked every morning, delivered in a three-hour slot you choose. Eggless options on most cakes.",
  applicationName: "caketown",
  openGraph: {
    type: "website",
    siteName: "caketown",
    locale: "en_IN",
    title: "caketown · Fresh baked happiness, delivered",
    description: "Cakes made to order, breads and pastries baked every morning, delivered in a slot you choose.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <SmoothScroll />
          <Navbar />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <Toaster />
          <Cursor />
        </Providers>
      </body>
    </html>
  );
}
