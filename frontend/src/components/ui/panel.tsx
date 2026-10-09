import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Workspace card — standard white surface for interactive content.
 * Pass `interactive` for cards the user can act on: hover deepens the border
 * and lifts the card slightly (QuizCore-style restrained elevation).
 */
export function Panel({
  children,
  className,
  interactive = false,
  ...rest
}: { children: ReactNode; className?: string; interactive?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl2 border border-line bg-surface shadow-card",
        interactive &&
          "transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#C3D4CA] hover:shadow-raised",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-tiny text-ink-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "border-line bg-subtle text-ink-muted",
  good: "border-[#BFDCCB] bg-brand-light text-[#1D493D]",
  warn: "border-[#E3CBA4] bg-[#FAF3E6] text-[#8A5E0F]",
  bad: "border-[#E8C4C4] bg-[#FBEFEF] text-[#A03838]",
  info: "border-[#C4D6E4] bg-[#EEF4F8] text-[#3A6183]",
};

export function DataBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DemoPill() {
  return null;
}
