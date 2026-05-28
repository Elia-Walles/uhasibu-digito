"use client";
import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "gold";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-ud-primary text-white hover:bg-ud-primary-hover shadow-sm",
  secondary: "bg-ud-primary-50 text-ud-primary hover:bg-ud-primary-100",
  ghost:     "bg-transparent text-ud-text-primary hover:bg-ud-surface-2",
  danger:    "bg-ud-danger text-white hover:bg-red-700 shadow-sm",
  outline:   "bg-white border border-ud-border text-ud-text-primary hover:border-ud-primary hover:text-ud-primary",
  gold:      "bg-ud-gold text-ud-obsidian hover:bg-amber-400 shadow-gold-glow",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, fullWidth, className, children, disabled, ...props },
  ref
) {
  const interactive = !disabled && !loading;
  return (
    <motion.button
      ref={ref}
      {...(interactive ? { whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 } } : {})}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-xl transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
});
