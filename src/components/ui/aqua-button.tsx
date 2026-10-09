"use client";

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AquaTwin button system — directly derived from QuizCore architecture:
 *  - Motion/motion-language: hover lift (-translate-y-0.5), press scale (scale-[0.97]).
 *  - Supports noLift option to disable hover translation (for navbar components).
 *  - Supports glassmorphic translucent Gaussian blur variants (glass, glass-on-dark).
 *  - Colors preserved strictly from AquaTwin's design system.
 */

export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-300 select-none cursor-pointer whitespace-nowrap box-border hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60";

export const BUTTON_VARIANTS = {
  /* Brand green CTA — main actions */
  primary:
    "bg-brand text-white border-2 border-brand hover:bg-brand-dark hover:border-brand-dark shadow-sm hover:shadow-md",
  /* Glassmorphic frosted outline — translucent with Gaussian blur */
  outline:
    "backdrop-blur-md bg-white/25 text-ink border-2 border-white/55 hover:bg-white/45 hover:border-white/75 hover:text-brand-dark shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]",
  /* Translucent Gaussian blur glass (light) */
  glass:
    "backdrop-blur-md bg-white/20 text-ink border border-white/50 hover:bg-white/40 hover:border-white/70 hover:text-brand-dark shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]",
  /* Translucent Gaussian blur glass (over dark video/background) */
  "glass-on-dark":
    "backdrop-blur-xl bg-white/12 text-white border-2 border-white/30 hover:bg-white/22 hover:border-white/55 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
  /* Surface solid secondary */
  secondary:
    "bg-surface text-ink border-2 border-line hover:border-brand/40 hover:bg-surface-variant hover:text-brand-dark shadow-sm",
  /* Soft tinted action */
  accent:
    "bg-[#EEF5F2] text-[#2A5446] border-2 border-[#BFDCCB] hover:bg-[#E0EDE8] hover:border-[#9DC9B6] hover:text-brand-dark",
  /* Solid dark neutral */
  dark:
    "bg-[#0A1F18] text-white border-2 border-[#0A1F18] hover:bg-[#163A31] shadow-sm hover:shadow-md",
  /* Destructive */
  danger:
    "bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 shadow-sm hover:shadow-md",
  "outline-danger":
    "bg-transparent text-red-600 border-2 border-red-600/50 hover:bg-red-50 hover:border-red-600",
  /* Quiet tertiary */
  ghost:
    "bg-transparent text-ink border-2 border-transparent hover:bg-brand-light/60",
  /* Dark-surface adaptations */
  "primary-on-dark":
    "bg-brand text-white border-2 border-brand hover:bg-brand-dark hover:border-brand-dark shadow-sm hover:shadow-md",
  "outline-on-dark":
    "backdrop-blur-xl bg-white/15 text-white border-2 border-white/35 hover:bg-white/25 hover:border-white/60 shadow-sm",
};

export const BUTTON_SIZES = {
  sm: "h-9 px-4 text-xs font-bold leading-none gap-1.5",
  md: "h-11 px-5 text-sm font-bold leading-none gap-2",
  lg: "h-14 px-8 text-base font-bold leading-none gap-2.5",
};

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

export const buttonClasses = (
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
  noLift = false
) =>
  [
    BUTTON_BASE,
    noLift ? "hover:translate-y-0" : "",
    BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
    BUTTON_SIZES[size] || BUTTON_SIZES.md,
    className,
  ]
    .filter(Boolean)
    .join(" ");

export interface AquaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  noLift?: boolean;
  children?: ReactNode;
  className?: string;
}

export const AquaButton = forwardRef<HTMLButtonElement, AquaButtonProps>(
  function AquaButton(
    {
      variant = "secondary",
      size = "md",
      icon = null,
      iconRight = null,
      loading = false,
      success = false,
      fullWidth = false,
      noLift = false,
      className = "",
      children,
      disabled,
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        className={cn(
          buttonClasses(variant, size, "", noLift),
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {loading ? (
          <span
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : success ? (
          <Check size={14} aria-hidden="true" className="shrink-0" />
        ) : (
          icon && <span className="shrink-0 leading-none" aria-hidden="true">{icon}</span>
        )}

        {success ? <span>Done</span> : children}

        {iconRight && !loading && !success && (
          <span className="shrink-0 leading-none" aria-hidden="true">{iconRight}</span>
        )}
      </button>
    );
  }
);

export interface AquaLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  noLift?: boolean;
  className?: string;
  children?: ReactNode;
  external?: boolean;
}

export function AquaLink({
  href,
  variant = "secondary",
  size = "md",
  icon = null,
  iconRight = null,
  fullWidth = false,
  noLift = false,
  className = "",
  children,
  external = false,
}: AquaLinkProps) {
  const cls = cn(
    buttonClasses(variant, size, "", noLift),
    fullWidth && "w-full",
    className
  );

  const inner = (
    <>
      {icon && <span className="shrink-0 leading-none" aria-hidden="true">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0 leading-none" aria-hidden="true">{iconRight}</span>}
    </>
  );

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
