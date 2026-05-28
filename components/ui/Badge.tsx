import { cn } from "@/lib/utils/cn";

type Variant = "success" | "warning" | "danger" | "info" | "default" | "teal" | "gold" | "obsidian";
type Size = "sm" | "md";

interface BadgeProps {
  variant?: Variant;
  size?: Size;
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  success:  "bg-ud-success-bg text-ud-success",
  warning:  "bg-ud-warning-bg text-ud-warning",
  danger:   "bg-ud-danger-bg text-ud-danger",
  info:     "bg-ud-info-bg text-ud-info",
  default:  "bg-ud-surface-2 text-ud-text-secondary border border-ud-border",
  teal:     "bg-ud-primary-50 text-ud-primary",
  gold:     "bg-ud-gold-50 text-ud-gold-dark",
  obsidian: "bg-ud-obsidian text-white",
};

const SIZES: Record<Size, string> = {
  sm: "text-[10px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

export function Badge({ variant = "default", size = "sm", pulse, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
