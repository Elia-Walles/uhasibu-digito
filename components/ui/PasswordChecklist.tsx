"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/utils/password";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface PasswordChecklistProps {
  password: string;
  className?: string;
}

/**
 * Live password-policy checklist. Each rule turns green (with a check) the moment
 * `password` satisfies it. Policy comes from PASSWORD_RULES so the UI and the server
 * schema can never drift apart. Color-only transition keeps it reduced-motion friendly.
 */
export function PasswordChecklist({ password, className }: PasswordChecklistProps) {
  const t = useT();
  const reduce = useReducedMotion();
  return (
    <ul className={cn("mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2", className)} aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors duration-200",
              met ? "text-ud-success" : "text-ud-text-muted"
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border transition-colors duration-200",
                met ? "border-ud-success bg-ud-success text-white" : "border-ud-border bg-transparent"
              )}
              aria-hidden
            >
              {met ? (
                <motion.span
                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                  animate={reduce ? {} : { scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </motion.span>
              ) : (
                <span className="h-1 w-1 rounded-full bg-ud-text-faint" />
              )}
            </span>
            <span className="sr-only">{met ? t("Met:") : t("Not met:")}</span>
            {t(rule.label)}
          </li>
        );
      })}
    </ul>
  );
}
