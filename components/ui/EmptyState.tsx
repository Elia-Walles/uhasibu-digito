import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center text-center py-14 px-6", className)}>
      <div className="w-16 h-16 rounded-2xl bg-ud-primary-50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-ud-primary opacity-70" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-bold text-ud-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-ud-text-muted max-w-sm">{description}</p>
      {action && (
        <Button className="mt-5" variant="primary" onClick={action.onClick} icon={action.icon}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
