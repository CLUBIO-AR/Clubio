import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Barlow_Condensed, Barlow } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.clubio.com.ar"),
  title: "CLUBIO — Tus cuotas se cobran solas",
  description:
    "Sistema de cobros automáticos para gimnasios en Argentina. Cuotas automáticas, avisos por email, pago sin cuenta con MercadoPago. Sin setup fee.",
  manifest: "/manifest.json",
  openGraph: {
    title: "CLUBIO — Tus cuotas se cobran solas",
    description:
      "Sistema de cobros automáticos para gimnasios en Argentina. Cuotas automáticas, avisos por email, pago con MercadoPago.",
    url: "https://app.clubio.com.ar",
    siteName: "CLUBIO",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CLUBIO — Tus cuotas se cobran solas",
    description: "Sistema de cobros automáticos para gimnasios en Argentina.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${barlow.variable} ${barlowCondensed.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
