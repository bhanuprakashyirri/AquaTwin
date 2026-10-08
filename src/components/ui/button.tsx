import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white border border-brand hover:bg-brand-dark hover:shadow-raised hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  secondary:
    "bg-surface text-ink border border-line hover:bg-brand-light/70 hover:border-brand/40 hover:text-brand-dark hover:shadow-card hover:-translate-y-0.5 active:scale-[0.98]",
  ghost:
    "bg-transparent text-ink-muted border border-transparent hover:bg-subtle hover:text-ink active:scale-[0.98]",
  danger:
    "bg-danger text-white border border-danger hover:bg-[#b04541] hover:shadow-raised hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  success:
    "bg-success text-white border border-success hover:bg-brand-dark hover:shadow-raised hover:-translate-y-0.5 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-tiny gap-1.5",
  md: "h-9 px-5 text-sm gap-2",
  lg: "h-11 px-6 text-sm font-semibold gap-2.5",
};

const base =
  "group relative inline-flex select-none items-center justify-center rounded-full font-medium tracking-tight " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-40 cursor-pointer";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  loading = false,
  success = false,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  loading?: boolean;
  success?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[success ? "success" : variant], sizes[size], className)}
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
