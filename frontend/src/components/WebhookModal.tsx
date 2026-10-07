import React, { useState } from "react";
import { X, Send, RefreshCw, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { testSecurityWebhook } from "@/lib/api";

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
}

export default function WebhookModal({ isOpen, onClose, siteId }: WebhookModalProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [incidentType, setIncidentType] = useState("SQL_INJECTION");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    delivery_id?: string;
    signature_generated?: string;
    detail?: string;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await testSecurityWebhook(siteId, webhookUrl.trim(), incidentType);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Webhook dispatch failed";
      setResult({ status: "error", error: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl shadow-black/20 dark:shadow-black/80 space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-card-border pb-4">
          <span className="p-2 rounded-xl bg-foreground/10 text-foreground border border-card-border">
            <Send className="h-4 w-4 text-purple-400" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                SIEM & SecOps Webhook Dispatcher
              </h2>
              <span className="text-[10px] text-muted border border-card-border rounded px-1.5 py-0.5 font-mono">
                HMAC-SHA256
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Dispatch signed JSON threat alerts to Slack, Discord, or your enterprise SIEM.
            </p>
          </div>
        </div>

        {/* Cryptographic Signature Note */}
        <div className="p-3 rounded-lg border border-card-border bg-background/50 flex items-start gap-2.5 text-xs text-muted">
          <Shield className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Signature Verification:</span> Payloads are signed with an SHA-256 HMAC digest in header <code className="text-foreground font-mono bg-card px-1 rounded border border-card-border">X-Luminary-Signature: sha256=&lt;hash&gt;</code>.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Target Webhook URL
            </label>
            <input
              type="url"
              required
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/... or https://siem.corp/alert"
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-purple-500 font-mono transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Simulated Exploit Category
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="SQL_INJECTION">SQL Injection (SQLi)</option>
              <option value="XSS_ATTACK">Cross-Site Scripting (XSS)</option>
              <option value="PATH_TRAVERSAL">Directory Path Traversal</option>
              <option value="REMOTE_CODE_EXECUTION">Remote Code Execution (RCE)</option>
              <option value="SSRF_ATTACK">Server-Side Request Forgery (SSRF)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !webhookUrl.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {sending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              <span>{sending ? "Dispatching..." : "Dispatch Alert"}</span>
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono space-y-1 animate-fade-in ${
              result.status === "delivered"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.status === "delivered" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <span className="font-semibold">
                Delivery Status: {result.status.toUpperCase()}
              </span>
            </div>
            {result.delivery_id && (
              <p className="text-[11px] opacity-80">Delivery ID: {result.delivery_id}</p>
            )}
            {result.signature_generated && (
              <p className="text-[11px] opacity-90 truncate">
                Signature: {result.signature_generated}
              </p>
            )}
            {result.error && (
              <p className="text-[11px] text-red-300">Error: {result.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
