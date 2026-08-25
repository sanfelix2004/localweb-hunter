import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import { Atmosphere } from "@/components/Atmosphere";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "LocalWeb Hunter — Radar per lead locali",
    template: "%s · LocalWeb Hunter",
  },
  description:
    "Scansiona il territorio, trova PMI senza sito o con siti obsoleti, qualificale con un Health Score 0–100 e contattale in un click.",
  icons: { icon: "/favicon.svg" },
  keywords: [
    "lead generation",
    "PMI",
    "sito web",
    "agenzia web",
    "OpenStreetMap",
    "cold email",
  ],
  openGraph: {
    title: "LocalWeb Hunter — Radar per lead locali",
    description:
      "Il command center che trova attività invisibili online e chiude il primo contatto in un click.",
    locale: "it_IT",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[var(--bg)] text-[var(--ink)]">
        <Atmosphere />
        <div className="relative z-[1] min-h-full">{children}</div>
      </body>
    </html>
  );
}
