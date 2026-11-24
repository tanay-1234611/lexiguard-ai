import "./globals.css";
import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const display = Newsreader({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "LexiGuard AI: Understand before you sign",
  description: "Upload a contract and get a plain-English summary, risky clauses with their source text, and answers grounded in your document.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans bg-paper text-ink antialiased">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
