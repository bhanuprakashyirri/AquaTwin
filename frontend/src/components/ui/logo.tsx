"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light" | "auto";
  showText?: boolean;
  href?: string;
  className?: string;
  imageClassName?: string;
}

const sizeConfig = {
  xs: { img: 24, text: "text-sm", sub: "text-[8px]" },
  sm: { img: 32, text: "text-[15px]", sub: "text-[9px]" },
  md: { img: 40, text: "text-[17px]", sub: "text-[10px]" },
  lg: { img: 48, text: "text-xl", sub: "text-[11px]" },
  xl: { img: 64, text: "text-2xl", sub: "text-xs" },
};

export function Logo({
  size = "sm",
  variant = "auto",
  showText = true,
  href,
  className,
  imageClassName,
}: LogoProps) {
  const { img, text, sub } = sizeConfig[size];
  const isLight = variant === "light";
  const src = isLight ? "/logo-white.png" : "/logo.png";

  const content = (
    <div className={cn("group flex shrink-0 items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0",
          imageClassName
        )}
        style={{ width: img, height: img }}
      >
        <Image
          src={src}
          alt="AquaTwin Logo"
          width={img}
          height={img}
          className="h-full w-full object-contain"
          priority
        />
      </div>

      {showText && (
        <div className="leading-none">
          <div
            className={cn(
              "font-extrabold tracking-tight leading-none",
              text,
              isLight ? "text-white" : "text-ink"
            )}
          >
            AquaTwin
          </div>
          <div
            className={cn(
              "mt-1 font-bold uppercase tracking-[0.18em] leading-none",
              sub,
              isLight ? "text-white/60" : "text-ink-faint"
            )}
          >
            Irrigation Intelligence
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
