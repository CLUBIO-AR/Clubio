import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Avenir Next Pro — texto general, subtítulos (regular + bold/black)
const avenir = localFont({
  variable: "--font-avenir",
  src: [
    { path: "./fonts/AvenirNextLTPro-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/AvenirNextLTPro-Bold.otf",     weight: "700", style: "normal" },
  ],
  display: "swap",
});

// Gilroy — títulos en mayúscula. Solo tenemos el corte Black; se usa como único peso.
// El nombre de variable --font-fredoka se mantiene por compatibilidad: decenas de
// componentes ya referencian var(--font-fredoka) para headings/botones/labels en
// mayúscula, y redefinir acá qué tipografía carga esa variable evita tener que
// tocar cada uno de esos archivos uno por uno.
const fredoka = localFont({
  variable: "--font-fredoka",
  src: [{ path: "./fonts/Gilroy-Black.ttf", weight: "900", style: "normal" }],
  display: "swap",
});

// Povlar — SOLO para el wordmark "clubio" en minúscula (logo). No usar en otro lado.
const povlar = localFont({
  variable: "--font-povlar",
  src: [{ path: "./fonts/Povlar-Demo.ttf", weight: "400", style: "normal" }],
  display: "swap",
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
      className={`${avenir.variable} ${fredoka.variable} ${povlar.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
