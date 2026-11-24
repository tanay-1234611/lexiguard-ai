import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { buttonStyles } from "@/components/ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">LexiGuard AI</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm" aria-label="Main">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-ink-soft hover:bg-brand-tint hover:text-ink">Dashboard</Link>
          <Link href="/upload" className={buttonStyles("primary", "py-2")}>Upload a contract</Link>
        </nav>
      </div>
    </header>
  );
}
