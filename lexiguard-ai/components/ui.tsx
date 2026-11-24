import Link from "next/link";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/types/contract";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function buttonStyles(variant: Variant = "primary", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
    variant === "secondary" && "border border-line bg-white text-ink hover:bg-brand-tint",
    variant === "ghost" && "text-ink-soft hover:bg-brand-tint hover:text-ink",
    variant === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    extra
  );
}

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...rest} disabled={disabled || loading} className={buttonStyles(variant, className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonStyles(variant, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6", className)}>{children}</section>;
}

const SEVERITY: Record<Severity, string> = {
  Low: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Medium: "bg-amber-50 text-amber-900 border-amber-200",
  High: "bg-orange-50 text-orange-900 border-orange-300",
  Critical: "bg-red-50 text-red-800 border-red-300",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", SEVERITY[severity], className)}>{severity}</span>;
}

export function ModeBadge({ mode }: { mode: "live" | "demo" }) {
  return mode === "demo" ? (
    <span className="inline-flex items-center rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
      Demo data, not a live AI response
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-line bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand-dark">AI analysis (AWS Bedrock)</span>
  );
}

const METER: Record<Severity, string> = { Low: "bg-emerald-500", Medium: "bg-amber-400", High: "bg-orange-500", Critical: "bg-red-600" };

export function RiskMeter({ score, level }: { score: number; level: Severity }) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl leading-none">{score}</span>
        <span className="text-sm text-ink-soft">out of 100</span>
        <SeverityBadge severity={level} className="ml-auto" />
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-paper" role="img" aria-label={`Risk score ${score} of 100, ${level}`}>
        <div className={cn("h-full rounded-full", METER[level])} style={{ width: `${Math.max(3, score)}%` }} />
      </div>
    </div>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "error" | "warn"; children: ReactNode; className?: string }) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex gap-3 rounded-xl border p-3.5 text-sm",
        tone === "info" && "border-line bg-brand-tint text-ink",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-950",
        tone === "error" && "border-red-200 bg-red-50 text-red-900",
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <Notice tone="warn" className={className}>
      <strong className="font-semibold">LexiGuard AI provides informational assistance and does not replace advice from a qualified lawyer.</strong>{" "}
      AI analysis may be incomplete or inaccurate. Check important points against the original document.
    </Notice>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-soft" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}
