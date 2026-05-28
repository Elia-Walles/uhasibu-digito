import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  initials: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "teal" | "gold" | "obsidian";
  className?: string;
}

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
} as const;

const VARIANTS = {
  teal:     "gradient-teal text-white",
  gold:     "gradient-gold text-ud-obsidian",
  obsidian: "gradient-obsidian text-ud-primary-glow",
} as const;

export function Avatar({ initials, size = "md", variant = "teal", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-display font-bold flex-shrink-0",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
      aria-hidden="true"
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
