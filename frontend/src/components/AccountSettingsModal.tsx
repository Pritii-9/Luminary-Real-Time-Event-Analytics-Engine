"use client";

import React from "react";
import { User, Shield, CreditCard, Sparkles, CheckCircle, X } from "lucide-react";


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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-card-border bg-modal-bg p-6 md:p-8 shadow-2xl transition-all duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-muted hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <User className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Account Settings</h2>
            <p className="text-xs text-muted">Manage your profile and subscription preferences</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Profile Section */}
          <div className="rounded-xl border border-card-border bg-card/60 p-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-accent" />
              Profile Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                <span className="text-muted font-medium">Email Address</span>
                <span className="font-bold text-foreground font-mono text-xs">{email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted font-medium">Account Status</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  <CheckCircle className="h-3 w-3" /> Active
                </span>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="rounded-xl border border-card-border bg-card/60 p-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Current Plan & Limits
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">{planDisplayName} Tier</p>
                  <p className="text-xs text-muted">Includes {limit.toLocaleString()} monthly pageviews</p>
                </div>
                {onManageBilling && (
                  <button
                    onClick={() => {
                      onClose();
                      onManageBilling();
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/20 cursor-pointer transition-colors"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Manage Billing
                  </button>
                )}
              </div>
            </div>
          </div>


        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-background hover:brightness-105 active:scale-[0.98] cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
