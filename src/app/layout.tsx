import type { Metadata, Viewport } from "next";
import { Baloo_2, Chakra_Petch, Nunito, Pacifico } from "next/font/google";
import BootSplash from "@/components/BootSplash";
import { BOOT_BG, BOOT_SPLASH_CSS } from "@/components/bootSplashStyles";
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

// Techy squared face for the neon-arcade reskin (wordmark + headings).
const arcade = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-arcade",
  display: "swap",
});

// Friendly cursive for the claw game's title and its neon wall sign.
const script = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
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
  themeColor: "#0B0F17",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${arcade.variable} ${script.variable}`}
      style={{ backgroundColor: BOOT_BG, colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body style={{ backgroundColor: BOOT_BG, margin: 0, color: "#EAF2FF" }} suppressHydrationWarning>
        <style dangerouslySetInnerHTML={{ __html: BOOT_SPLASH_CSS }} />
        <BootSplash id="boot-splash" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=false;function hide(){if(d)return;d=true;var e=document.getElementById("boot-splash");if(!e)return;e.style.display="none";e.setAttribute("hidden","");e.setAttribute("aria-busy","false")}window.addEventListener("gretas-app-ready",hide);requestAnimationFrame(function(){setTimeout(hide,15000)})})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var key="gretas-chunk-reload";function recover(message){if(!message||!/ChunkLoadError|Loading chunk/.test(message))return;try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1")}catch(e){return}location.reload()}window.addEventListener("error",function(event){var err=event&&event.error;recover((event&&event.message)||(err&&(err.message||err.name))||"")});window.addEventListener("unhandledrejection",function(event){var reason=event&&event.reason;var message=typeof reason==="string"?reason:(reason&&(reason.message||reason.name))||"";recover(message)});window.addEventListener("load",function(){try{sessionStorage.removeItem(key)}catch(e){}})})();`,
          }}
        />
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
