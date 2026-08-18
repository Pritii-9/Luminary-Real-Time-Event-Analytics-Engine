import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-card-border bg-card px-4 py-3 animate-fade-in">
      <Icon className={`h-4 w-4 shrink-0 ${type === "success" ? "text-success" : type === "error" ? "text-danger" : "text-muted"}`} />
      <span className="text-xs font-medium text-foreground">{message}</span>
      <button
        onClick={onClose}
        className="text-muted hover:text-foreground ml-1 transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
