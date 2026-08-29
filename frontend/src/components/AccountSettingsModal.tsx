import React from "react";
import { User, Shield, CreditCard, CheckCircle, X } from "lucide-react";


interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  plan: string;
  limit: number;
  onManageBilling?: () => void;
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  email,
  plan,
  limit,
  onManageBilling,
}: AccountSettingsModalProps) {
  if (!isOpen) return null;

  const planDisplayName = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-lg border border-card-border bg-card p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
            <User className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Account Settings</h2>
            <p className="text-xs text-muted">Manage your profile and subscription</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Profile */}
          <div className="rounded-md border border-card-border bg-white/[0.02] p-4">
            <h3 className="text-[10px] font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Profile
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                <span className="text-muted text-xs">Email</span>
                <span className="text-foreground font-mono text-xs">{email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted text-xs">Status</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success border border-success/20 px-1.5 py-0.5 rounded">
                  <CheckCircle className="h-2.5 w-2.5" /> Active
                </span>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="rounded-md border border-card-border bg-white/[0.02] p-4">
            <h3 className="text-[10px] font-medium text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              Current Plan
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{planDisplayName} Tier</p>
                <p className="text-xs text-muted">{limit.toLocaleString()} monthly pageviews</p>
              </div>
              {onManageBilling && (
                <button
                  onClick={() => {
                    onClose();
                    onManageBilling();
                  }}
                  className="rounded-md border border-card-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Manage Billing
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 cursor-pointer transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
