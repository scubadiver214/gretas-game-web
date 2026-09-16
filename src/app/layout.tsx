import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import ServiceWorker from "@/components/ServiceWorker";
import Providers from "./providers";
import "./globals.css";

// Fat rounded display face for headings, buttons and every big number.
const display = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Greta's Game for fun",
  description:
    "Plan your own pizza adventure: make pizzas in the kitchen or deliver them by bike!",
  applicationName: "Greta's Game for fun",
  appleWebApp: { capable: true, title: "Greta's Game", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2E8DEF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
