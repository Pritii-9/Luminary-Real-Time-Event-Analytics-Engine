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

  const bgClass =
    type === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
      : type === "error"
      ? "bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400"
      : "bg-card border-card-border text-foreground";

  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-lg animate-fade-in backdrop-blur-md ${bgClass}`}>
      <Icon className="h-4.5 w-4.5 shrink-0" />
      <span className="text-xs font-bold">{message}</span>
      <button 
        onClick={onClose} 
        className="text-muted hover:text-foreground ml-1.5 transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
