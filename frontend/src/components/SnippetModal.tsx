import { useEffect, useState } from "react";
import { X, Copy, Check, Code, ShieldCheck, Terminal, Lock, FileCode, Cpu } from "lucide-react";
import { getSnippet } from "@/lib/api";

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  siteName?: string;
  siteDomain?: string;
}

export default function SnippetModal({
  isOpen,
  onClose,
  siteId,
  siteName,
  siteDomain,
}: SnippetModalProps) {
  const [snippet, setSnippet] = useState("");
  const [publicToken, setPublicToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"html" | "react" | "events">("html");

  const activeBackendUrl =
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://luminary-scalable-web-event-engine.onrender.com"
      : "http://localhost:8000");

  useEffect(() => {
    if (!isOpen || !siteId) return;
    setLoading(true);
    getSnippet(siteId)
      .then((data) => {
        const cleanSnippet = data.snippet.replace(
          /src="[^"]*\/tracker\.js/,
          `src="${activeBackendUrl}/tracker.js"`
        );
        setSnippet(cleanSnippet);
        setPublicToken(data.public_token);
      })
      .catch((err) => {
        console.error("Failed to fetch snippet", err);
        setSnippet(
          `<script defer src="${activeBackendUrl}/tracker.js" data-site-id="${siteId}"></script>`
        );
      })
      .finally(() => setLoading(false));
  }, [isOpen, siteId, activeBackendUrl]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const reactSnippet = `// Root Layout Component (app/layout.tsx or _app.tsx)
import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="${activeBackendUrl}/tracker.js"
          data-site-id="${siteId}"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

  const customEventSnippet = `// Dispatch conversion telemetry or custom user interactions
window.luminary?.track("checkout_completed", {
  plan_tier: "enterprise",
  value_usd: 299,
  currency: "USD",
  timestamp: new Date().toISOString()
});`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-card-border bg-card p-6 shadow-2xl shadow-black/20 dark:shadow-black/80 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header — Security / SRE Engine Pattern */}
        <div className="flex items-center gap-2.5 border-b border-card-border pb-4">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Code className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Client Telemetry SDK Installation
            </h2>
            <p className="text-xs text-muted">
              {siteName || siteDomain || "Workspace"} &bull; Public Token:{" "}
              <span className="font-mono text-foreground font-medium">{publicToken || siteId}</span>
            </p>
          </div>
        </div>

        {/* Ingestion Overview Card — Matches SecurityPage Analysis Block */}
        <div className="p-3.5 rounded-lg bg-background/50 border border-card-border space-y-1">
          <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-indigo-400" />
            Asynchronous Telemetry Ingestion Pipeline
          </h4>
          <p className="text-foreground leading-relaxed text-xs">
            Luminary's lightweight tracker (&lt;2KB) collects pageviews, referrers, and user interactions without cookies. Events stream asynchronously via Redis Streams (<code className="font-mono text-zinc-300">XADD</code>) and flush in bulk to PostgreSQL to prevent database write locks.
          </p>
        </div>

        {/* Tab Navigation — Matches SecurityPage Remediation Tabs */}
        <div className="flex border-b border-card-border gap-2">
          <button
            onClick={() => setActiveTab("html")}
            className={`pb-2 px-1 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
              activeTab === "html"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            HTML / Standard Script
          </button>
          <button
            onClick={() => setActiveTab("react")}
            className={`pb-2 px-1 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
              activeTab === "react"
                ? "border-purple-400 text-purple-400"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Next.js / React
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`pb-2 px-1 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
              activeTab === "events"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            Custom Events API
          </button>
        </div>

        {/* Tab 1: HTML / Standard Script */}
        {activeTab === "html" && (
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-card-border space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                HTML &lt;head&gt; Telemetry Snippet
              </h4>
              <button
                onClick={() => copyToClipboard(snippet, "html")}
                className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedKey === "html" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedKey === "html" ? "Copied" : "Copy Snippet"}
              </button>
            </div>
            <pre className="font-mono text-[11px] bg-black/60 p-3 rounded-lg border border-white/[0.06] text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {snippet}
            </pre>
          </div>
        )}

        {/* Tab 2: Next.js / React Script */}
        {activeTab === "react" && (
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-card-border space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5" />
                Next.js App Router Integration (next/script)
              </h4>
              <button
                onClick={() => copyToClipboard(reactSnippet, "react")}
                className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedKey === "react" ? <Check className="h-3 w-3 text-purple-400" /> : <Copy className="h-3 w-3" />}
                {copiedKey === "react" ? "Copied" : "Copy React Code"}
              </button>
            </div>
            <pre className="font-mono text-[11px] bg-black/60 p-3 rounded-lg border border-white/[0.06] text-purple-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {reactSnippet}
            </pre>
          </div>
        )}

        {/* Tab 3: Custom Events API */}
        {activeTab === "events" && (
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-card-border space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                Client-Side Custom Goal & Event Dispatcher
              </h4>
              <button
                onClick={() => copyToClipboard(customEventSnippet, "events")}
                className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedKey === "events" ? <Check className="h-3 w-3 text-cyan-400" /> : <Copy className="h-3 w-3" />}
                {copiedKey === "events" ? "Copied" : "Copy Event Code"}
              </button>
            </div>
            <pre className="font-mono text-[11px] bg-black/60 p-3 rounded-lg border border-white/[0.06] text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {customEventSnippet}
            </pre>
          </div>
        )}

        {/* Verification Footer Note */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>After embedding, trigger a pageview to verify ingestion in Threat Engine</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-card border border-card-border hover:bg-foreground/5 text-foreground cursor-pointer transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
