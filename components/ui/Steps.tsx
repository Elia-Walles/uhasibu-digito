"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Step {
  label: string;
  description?: string;
}

interface StepsProps {
  steps: Step[];
  current: number; // 0-indexed
  className?: string;
}

export function Steps({ steps, current, className }: StepsProps) {
  return (
    <ol className={cn("flex items-start gap-2 w-full", className)}>
      {steps.map((step, i) => {
        const isActive = i === current;
        const isComplete = i < current;
        return (
          <li key={step.label} className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <motion.div
                initial={false}
                animate={{ scale: isActive ? 1.05 : 1 }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors",
                  isComplete
                    ? "bg-ud-primary text-white"
                    : isActive
                    ? "bg-ud-primary-50 text-ud-primary ring-2 ring-ud-primary"
                    : "bg-ud-surface-2 text-ud-text-muted"
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : i + 1}
              </motion.div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-ud-surface-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isComplete ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-ud-primary"
                  />
                </div>
              )}
            </div>
            <div className="mt-2 min-w-0">
              <div
                className={cn(
                  "text-xs font-medium truncate",
                  isActive ? "text-ud-primary" : isComplete ? "text-ud-text-primary" : "text-ud-text-muted"
                )}
              >
                {step.label}
              </div>
              {step.description && (
                <div className="text-[10px] text-ud-text-muted truncate">{step.description}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
