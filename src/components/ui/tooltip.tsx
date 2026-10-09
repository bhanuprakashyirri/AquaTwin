"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/motion";

/**
 * AquaTwin tooltip — fades in and moves 4px into place after a short intent
 * delay; never blocks the pointer. Shows on hover AND keyboard focus.
 */
export function Tooltip({
  content,
  side = "top",
  children,
  className,
}: {
  content: ReactNode;
  side?: "top" | "bottom";
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex w-full flex-col">
        {children}
      </span>
      <AnimatePresence>
        {open ? (
          <motion.span
            role="tooltip"
            id={id}
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 2 : -2, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: EASE, delay: 0.12 }}
            className={cn(
              "pointer-events-none absolute left-1/2 z-40 w-56 -translate-x-1/2 rounded-lg border border-line bg-ink px-3 py-2 text-tiny leading-relaxed text-white shadow-pop",
              side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            )}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
