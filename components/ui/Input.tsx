"use client";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, prefixIcon, suffixIcon, containerClassName, className, id, ...props },
  ref
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative flex items-center rounded-xl bg-white border transition-all",
          "border-ud-border focus-within:border-ud-primary focus-within:ring-2 focus-within:ring-ud-primary/15",
          error && "border-ud-danger focus-within:border-ud-danger focus-within:ring-ud-danger/15"
        )}
      >
        {prefixIcon && (
          <span className="flex items-center justify-center pl-3 text-ud-text-muted">
            {prefixIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "flex-1 h-10 px-3 bg-transparent outline-none text-sm placeholder:text-ud-text-faint",
            prefixIcon && "pl-2",
            suffixIcon && "pr-2",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {suffixIcon && (
          <span className="flex items-center justify-center pr-3 text-ud-text-muted">
            {suffixIcon}
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-ud-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ud-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
