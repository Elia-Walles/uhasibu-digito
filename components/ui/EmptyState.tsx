"use client";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex flex-col items-center text-center py-14 px-6", className)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
        className="w-16 h-16 rounded-2xl bg-ud-primary-50 flex items-center justify-center mb-4"
      >
        <Icon className="w-8 h-8 text-ud-primary opacity-70" strokeWidth={1.5} />
      </motion.div>
      <h3 className="font-display text-lg font-bold text-ud-text-primary">{t(title)}</h3>
      <p className="mt-1 text-sm text-ud-text-muted max-w-sm">{t(description)}</p>
      {action && (
        <Button className="mt-5" variant="primary" onClick={action.onClick} icon={action.icon}>
          {t(action.label)}
        </Button>
      )}
    </motion.div>
  );
}
