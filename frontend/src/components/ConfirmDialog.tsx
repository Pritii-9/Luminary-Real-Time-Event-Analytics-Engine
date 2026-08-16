import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-modal-bg p-6 shadow-2xl transition-all duration-200">
        <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
        <p className="text-xs text-muted mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-card-border bg-background/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 px-4 py-2.5 text-xs font-bold text-foreground cursor-pointer transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-4 py-2.5 text-xs font-bold text-red-500 dark:text-red-400 cursor-pointer transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
