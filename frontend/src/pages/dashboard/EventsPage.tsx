import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { fetchCustomEvents, fetchSummary } from "@/lib/api";
import { Zap, Code, Copy, Check, Target, Users } from "lucide-react";

export default function EventsPage() {
  const { siteId } = useParams();
  const [events, setEvents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function load() {
      if (!siteId) return;
      setLoading(true);
      try {
        const [eventData, sumData] = await Promise.all([
          fetchCustomEvents(siteId, days),
          fetchSummary(siteId, days),
        ]);
        setEvents(eventData || []);
        setSummary(sumData);
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId, days]);

  const totalEventTriggers = useMemo(() => {
    return events.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [events]);

  const topConversionRate = useMemo(() => {
    if (!summary?.visitors || events.length === 0) return "0.0%";
    const rates = events.map((e) => (e.unique_visitors / summary.visitors) * 100);
    return `${Math.max(...rates).toFixed(1)}%`;
  }, [events, summary]);

  const codeSnippet = `// Ingest custom business event into Luminary stream
window.luminary?.track("order_completed", {
  order_id: "ord_9482",
  revenue_usd: 149.00,
  tier: "enterprise"
});`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              Custom Events & Conversion Goals
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Client-side event payloads, business goal conversions, and trigger frequency telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-card-border overflow-hidden bg-card">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  days === d
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Total Invocations</span>
            <Zap className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{totalEventTriggers.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Dispatched triggers</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Registered Event Keys</span>
            <Target className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{events.length.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Distinct goal schemas</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Max Conversion Rate</span>
            <Users className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{topConversionRate}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Relative to visitors</p>
        </div>
      </div>

      {/* Code Snippet Helper - Senior SDE Dark Console Style */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-card-border bg-foreground/[0.01]">
          <div className="flex items-center gap-2">
            <Code className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-medium text-foreground">SDK Ingestion API Spec</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono border border-card-border bg-background text-muted hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copiedCode ? "Copied" : "Copy Call"}</span>
          </button>
        </div>
        <div className="p-3 bg-[#0d0e11] text-[#e1e4e8] font-mono text-xs overflow-x-auto selection:bg-cyan-500/30">
          <div className="text-zinc-500 select-none">// Ingest custom business event into Luminary event buffer</div>
          <div>
            <span className="text-purple-400">window</span>.<span className="text-cyan-300">luminary</span>?.<span className="text-emerald-400">track</span>(
            <span className="text-amber-300">"order_completed"</span>, &#123;
          </div>
          <div className="pl-4">
            <span className="text-blue-300">order_id</span>: <span className="text-amber-300">"ord_9482"</span>,
          </div>
          <div className="pl-4">
            <span className="text-blue-300">revenue_usd</span>: <span className="text-rose-300">149.00</span>,
          </div>
          <div className="pl-4">
            <span className="text-blue-300">tier</span>: <span className="text-amber-300">"enterprise"</span>
          </div>
          <div>&#125;);</div>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-card-border text-[10px] font-medium text-muted uppercase tracking-wider bg-foreground/[0.01]">
          <span className="col-span-6">Goal / Event Identifier</span>
          <span className="col-span-2 text-right">Raw Triggers</span>
          <span className="col-span-2 text-right">Unique Visitors</span>
          <span className="col-span-2 text-right">Conversion Rate</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Ingesting custom event telemetry...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No custom events recorded yet. Call <code className="font-mono text-foreground bg-foreground/[0.05] px-1.5 py-0.5 rounded border border-card-border">window.luminary.track()</code> from your frontend.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {events.map((e, idx) => {
              const convRate = summary?.visitors
                ? ((e.unique_visitors / summary.visitors) * 100).toFixed(1)
                : "0.0";
              return (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-2.5 hover:bg-foreground/[0.02] transition-colors">
                  <div className="col-span-6 flex items-center gap-2 min-w-0">
                    <Zap className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-xs font-mono font-medium text-foreground truncate">{e.event_name}</span>
                  </div>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                    {e.count.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-xs text-muted text-right tabular-nums font-mono">
                    {e.unique_visitors.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums font-mono">
                    {convRate}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
