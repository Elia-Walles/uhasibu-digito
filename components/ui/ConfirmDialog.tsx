"use client";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useT } from "@/lib/hooks/useT";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t(cancelLabel)}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {t(confirmLabel)}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-ud-danger-bg flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-ud-danger" />
        </div>
        <p className="text-sm text-ud-text-secondary leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}
