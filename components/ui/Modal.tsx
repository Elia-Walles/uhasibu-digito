"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Size = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  size?: Size;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
}

const SIZES: Record<Size, string> = {
  sm:   "max-w-md",
  md:   "max-w-lg",
  lg:   "max-w-2xl",
  xl:   "max-w-4xl",
  full: "max-w-[95vw] max-h-[95vh]",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
  footer,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-ud-obsidian/50 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                className={cn(
                  "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)]",
                  "bg-white rounded-2xl shadow-elevated overflow-hidden flex flex-col",
                  SIZES[size]
                )}
              >
                <div className="flex items-start justify-between px-6 py-4 border-b border-ud-border flex-shrink-0">
                  <div>
                    <Dialog.Title className="font-display text-lg font-bold text-ud-text-primary">
                      {title}
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-ud-text-muted">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className="p-2 rounded-lg hover:bg-ud-surface-2 text-ud-text-muted transition-colors"
                    aria-label="Close dialog"
                  >
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
                {footer && (
                  <div className="px-6 py-4 border-t border-ud-border bg-ud-surface-2 flex items-center justify-end gap-2 flex-shrink-0">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
