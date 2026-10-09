"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toastEnter } from "@/lib/motion";

/**
 * AquaTwin toast system — bottom-right stack (max 3), auto-dismiss after 3.2s,
 * slides in from the right edge. Non-blocking, dismissible, polite to screen
 * readers. Modeled on QuizCore's toast interaction pattern.
 */

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void }>({
  toast: () => {},
});

const STYLES: Record<ToastType, { icon: typeof CheckCircle2; cls: string; iconCls: string }> = {
  success: { icon: CheckCircle2, cls: "border-[#BFDCCB] bg-brand-light text-brand-dark", iconCls: "text-success" },
  error: { icon: AlertTriangle, cls: "border-[#E7C9C9] bg-[#FBF1F1] text-[#8C3535]", iconCls: "text-danger" },
  info: { icon: Info, cls: "border-line bg-surface text-ink", iconCls: "text-info" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex w-[min(360px,calc(100vw-3rem))] flex-col gap-3">
        <AnimatePresence>
          {toasts.map(({ id, message, type }) => {
            const cfg = STYLES[type];
            return (
              <motion.div
                key={id}
                variants={toastEnter}
                initial="hidden"
                animate="show"
                exit="exit"
                role="status"
                aria-live="polite"
                className={cn(
                  "pointer-events-auto flex items-start gap-2.5 rounded-xl2 border px-4 py-3 shadow-pop backdrop-blur",
                  cfg.cls,
                )}
              >
                <cfg.icon size={17} className={cn("mt-0.5 shrink-0", cfg.iconCls)} aria-hidden />
                <span className="flex-1 text-sm leading-snug">{message}</span>
                <button
                  onClick={() => dismiss(id)}
                  aria-label="Dismiss"
                  className="-mr-1 -mt-0.5 rounded-md p-1 opacity-50 transition-opacity hover:opacity-100"
                >
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
