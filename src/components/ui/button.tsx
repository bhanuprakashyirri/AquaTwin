import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark border border-brand",
  secondary:
    "bg-surface text-brand-dark border border-[#BFDCCB] hover:bg-brand-light",
  ghost: "bg-transparent text-ink-muted hover:bg-subtle hover:text-ink border border-transparent",
  danger: "bg-danger text-white hover:bg-[#B03E3E] border border-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-tiny",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-sm font-semibold",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: { variant?: Variant; size?: Size; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
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
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </a>
  );
}
