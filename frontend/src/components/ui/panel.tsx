import { cn } from "@/lib/utils";
import React, { type ReactNode, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./toast";
import { useRecentActions } from "@/lib/recent-actions";

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
        <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
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

export function RecentlyViewed({ items }: { items: { id: string; title: string; timestamp: Date }[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Panel className="w-full mx-auto overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-variant transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-brand" />
          <h3 className="font-bold text-ink">Recently Viewed</h3>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <span className="bg-brand-light text-brand-dark px-2 py-0.5 rounded-full text-micro font-bold">
              {items.length}
            </span>
          )}
          <span className="text-ink-muted text-sm">{expanded ? "Hide" : "Show"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line px-5 py-3">
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-4">No recent actions.</p>
          ) : (
            <div className="space-y-3 py-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm group">
                  <span className="text-ink font-medium group-hover:text-brand transition-colors cursor-pointer">
                    {item.title}
                  </span>
                  <span className="text-tiny text-ink-muted font-mono bg-surface-variant px-1.5 py-0.5 rounded border border-line">
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

export function ActionDemo() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const { actions, addAction } = useRecentActions();
  const { toast } = useToast();

  const handleAction = async (actionName: string) => {
    setStatus("loading");
    // Simulate a network request
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setStatus("success");
    toast(`${actionName} completed!`, "success");
    
    // Add to global history
    addAction(actionName);

    // Reset button after a short delay
    setTimeout(() => {
      setStatus("idle");
    }, 2000);
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-6">
      {/* Primary Action Section */}
      <Panel className="p-6 text-center">
        <h3 className="font-bold text-ink mb-2">Perform Action</h3>
        <p className="text-sm text-ink-muted mb-6">
          Trigger an action below to add it to your recently viewed history.
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button 
            variant="primary"
            loading={status === "loading"}
            success={status === "success"}
            onClick={() => handleAction("Run Simulation")}
          >
            Run Simulation
          </Button>
          <Button 
            variant="outline"
            disabled={status === "loading"}
            onClick={() => handleAction("View Report")}
          >
            View Report
          </Button>
        </div>
      </Panel>

      {/* Separate Recently Viewed Section */}
      <RecentlyViewed items={actions} />
    </div>
  );
}
