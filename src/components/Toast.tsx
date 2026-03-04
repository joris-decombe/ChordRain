"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastMessage {
  id: number;
  text: string;
  type: "error" | "info";
}

let toastId = 0;
let addToastFn: ((text: string, type: "error" | "info") => void) | null = null;

export function showToast(text: string, type: "error" | "info" = "info") {
  addToastFn?.(text, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: "error" | "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto pixel-panel p-4 max-w-sm cursor-pointer"
            style={{
              borderColor:
                toast.type === "error"
                  ? "var(--color-accent-secondary)"
                  : "var(--color-accent-primary)",
            }}
            onClick={() => dismiss(toast.id)}
          >
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold shrink-0">
                {toast.type === "error" ? "!!" : ">_"}
              </span>
              <p className="text-sm text-[var(--color-text)]">{toast.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
