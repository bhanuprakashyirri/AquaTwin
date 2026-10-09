"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, modalOpen } from "@/lib/motion";
import { Button } from "./button";

/**
 * AquaTwin modal — dark scrim fades, panel scales in from 0.92 on the spring
 * curve with an 8px rise (QuizCore modal DNA). ESC + click-outside close,
 * body scroll locked while open.
 */
export function Modal({
  open,
  onClose,
  children,
  maxWidth = "max-w-md",
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  label?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            variants={modalOpen}
            initial="hidden"
            animate="show"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn("w-full overflow-hidden rounded-xl2 border border-line bg-surface shadow-pop", maxWidth)}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Confirmation dialog used for irreversible demo actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="p-6">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? (
              <span
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
            ) : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
