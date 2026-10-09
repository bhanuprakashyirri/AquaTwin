"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { dropdownEnter } from "@/lib/motion";

/**
 * AquaTwin dropdown — QuizCore's filter interaction: chevron rotates 180°,
 * open trigger gets a brand ring, the menu grows from its top corner on the
 * spring curve, and the selected option carries a check. ESC + outside click
 * close it.
 */
export function Dropdown<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel || current?.label || "Select option"}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex cursor-pointer select-none items-center gap-1.5 rounded-lg border bg-surface px-2.5 py-1.5 text-tiny font-medium text-ink-soft",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-[#B8CCC0] hover:text-ink",
          open ? "border-brand ring-2 ring-brand/15" : "border-line",
        )}
      >
        {current?.label}
        <ChevronDown
          size={14}
          aria-hidden
          className={cn("text-ink-faint transition-transform duration-200", open ? "rotate-180" : "")}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            variants={dropdownEnter}
            initial="hidden"
            animate="show"
            exit="exit"
            role="listbox"
            className="absolute right-0 z-40 mt-1.5 min-w-full w-max origin-top-right overflow-hidden rounded-xl2 border border-line bg-surface py-1 shadow-pop"
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-tiny",
                    "transition-colors duration-150",
                    selected ? "bg-brand-light font-semibold text-brand-dark" : "text-ink-muted hover:bg-subtle hover:text-ink",
                  )}
                >
                  {opt.label}
                  {selected ? <Check size={13} className="text-brand" aria-hidden /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
