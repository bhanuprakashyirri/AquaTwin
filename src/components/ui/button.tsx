/**
 * ============================================================================
 * AquaTwin Canonical Button System (Derived from QuizCore Architecture)
 * ============================================================================
 *
 * Use these standard components everywhere in the project for 100% consistency:
 *
 * 1. <Button> / <AquaButton>
 *    Native interactive button with hover-lift (-translate-y-0.5), press-scale (0.97),
 *    optional loading spinner, success checkmark, icons, and pill geometry.
 *
 * 2. <LinkButton> / <AquaLink>
 *    Next.js Link navigation component with identical button styles and physics.
 *
 * Key Variants:
 *  - "primary":       Brand green solid CTA with directional depth (e.g. "Explore Live Demo →")
 *  - "glass":         Frosted translucent glass with Gaussian blur (e.g. "Sign In" in navbar)
 *  - "glass-on-dark": Translucent Gaussian blur glass for dark hero/video (e.g. "How It Works")
 *  - "outline":       Frosted border glass button for secondary actions
 *  - "secondary":     Light neutral surface pill
 *  - "dark":          Deep dark forest neutral
 *  - "danger":        Destructive action
 *  - "accent":        Subtle soft-tinted action
 *
 * Sizing:
 *  - "sm": h-9,  px-4, text-xs
 *  - "md": h-11, px-5, text-sm (default)
 *  - "lg": h-14, px-8, text-base
 *
 * Modifiers:
 *  - noLift={true}:   Disables hover vertical lift (ideal for fixed navbars/headers)
 *  - fullWidth={true}: Expands to 100% container width
 *  - icon / iconRight: Pre/post icons with auto-sizing
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  AquaButton,
  AquaLink,
  buttonClasses,
  BUTTON_BASE,
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  type ButtonVariant,
  type ButtonSize,
  type AquaButtonProps,
  type AquaLinkProps,
} from "./aqua-button";

export {
  buttonClasses,
  BUTTON_BASE,
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  AquaButton,
  AquaLink,
};
export type { ButtonVariant, ButtonSize };

export type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "glass"
  | "glass-on-dark"
  | "accent"
  | "dark"
  | "danger"
  | "outline-danger"
  | "ghost"
  | "primary-on-dark"
  | "outline-on-dark"
  | "success"; // legacy alias

const variantNormalizer = (v: Variant): ButtonVariant => {
  if (v === "success") return "primary";
  return v;
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  noLift?: boolean;
  className?: string;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
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
      ...rest
    },
    ref
  ) {
    return (
      <AquaButton
        ref={ref}
        variant={variantNormalizer(variant)}
        size={size}
        icon={icon}
        iconRight={iconRight}
        loading={loading}
        success={success}
        fullWidth={fullWidth}
        noLift={noLift}
        className={className}
        {...rest}
      >
        {children}
      </AquaButton>
    );
  }
);

export interface LinkButtonProps {
  href: string;
  variant?: Variant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  noLift?: boolean;
  className?: string;
  children?: ReactNode;
  external?: boolean;
}

export function LinkButton({
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
}: LinkButtonProps) {
  return (
    <AquaLink
      href={href}
      variant={variantNormalizer(variant)}
      size={size}
      icon={icon}
      iconRight={iconRight}
      fullWidth={fullWidth}
      noLift={noLift}
      className={className}
      external={external}
    >
      {children}
    </AquaLink>
  );
}

export default Button;
