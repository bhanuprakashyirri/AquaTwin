import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white border border-brand hover:bg-brand-dark hover:shadow-raised hover:-translate-y-px active:translate-y-0",
  secondary:
    "bg-surface text-brand-dark border border-[#BFDCCB] hover:bg-brand-light hover:border-[#A9C8B8] active:scale-[0.98]",
  ghost:
    "bg-transparent text-ink-muted border border-transparent hover:bg-subtle hover:text-ink active:scale-[0.98]",
  danger:
    "bg-danger text-white border border-danger hover:bg-[#B03E3E] hover:shadow-raised hover:-translate-y-px active:translate-y-0",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-tiny",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm font-semibold",
};

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 " +
  "disabled:pointer-events-none disabled:opacity-40";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  loading = false,
  ...rest
}: { variant?: Variant; size?: Size; children: ReactNode; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {children}
    </a>
  );
}
