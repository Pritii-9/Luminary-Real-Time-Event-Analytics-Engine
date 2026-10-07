import { useEffect, useState } from "react";
import { X, Copy, Check, Activity, RefreshCw, Terminal, Layers, Cpu, ShieldCheck } from "lucide-react";
import { fetchRawPrometheusMetrics, API_URL, type SreTelemetryData } from "@/lib/api";

interface PrometheusMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sreData: SreTelemetryData | null;
}

export default function PrometheusMetricsModal({
  isOpen,
  onClose,
  sreData,
}: PrometheusMetricsModalProps) {
  const [rawMetrics, setRawMetrics] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stream" | "visual">("stream");

  const loadRaw = async () => {
    setLoading(true);
    try {
      const text = await fetchRawPrometheusMetrics();
      setRawMetrics(text);
    } catch {
      setRawMetrics("# Failed to connect to backend /metrics exporter. Ensure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRaw();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const metricsEndpointUrl = `${API_URL}/metrics`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-card-border bg-card p-6 shadow-2xl shadow-black/20 dark:shadow-black/80 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-card-border pb-4">
          <span className="p-2 rounded-xl bg-foreground/10 text-foreground border border-card-border">
            <Activity className="h-4 w-4 text-emerald-400" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Prometheus SRE Metrics Exporter
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live Telemetry
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Standard OpenMetrics format (text/plain; version=0.0.4) for Datadog, Prometheus, & Grafana scrapers.
            </p>
          </div>
        </div>

        {/* Scraper Endpoint Banner */}
        <div className="p-3 rounded-lg border border-card-border bg-background/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold block">
              Scrape Target URL (Prometheus / Datadog Agent)
            </span>
            <code className="text-xs text-foreground font-mono truncate block mt-0.5">
              {metricsEndpointUrl}
            </code>
          </div>
          <button
            onClick={() => copyToClipboard(metricsEndpointUrl, "url")}
            className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-card-border bg-card hover:bg-card/80 text-foreground transition-colors cursor-pointer flex-shrink-0"
          >
            {copiedKey === "url" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            <span>{copiedKey === "url" ? "Copied" : "Copy Endpoint"}</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-card-border">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("stream")}
              className={`pb-2 px-1 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
                activeTab === "stream"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Raw Prometheus Exposition
            </button>
            <button
              onClick={() => setActiveTab("visual")}
              className={`pb-2 px-1 text-xs font-semibold cursor-pointer border-b-2 transition-all ${
                activeTab === "visual"
                  ? "border-indigo-400 text-indigo-400"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Parsed SRE Vitals
            </button>
          </div>

          <button
            onClick={loadRaw}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground pb-2 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content: Raw Exposition Stream */}
        {activeTab === "stream" && (
          <div className="p-3.5 rounded-lg bg-zinc-950 border border-card-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Terminal className="h-3.5 w-3.5" />
                Live Prometheus Output (HTTP 200 text/plain)
              </span>
              <button
                onClick={() => copyToClipboard(rawMetrics, "stream")}
                className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedKey === "stream" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "stream" ? "Copied" : "Copy Exposition Text"}</span>
              </button>
            </div>
            <pre className="font-mono text-[11px] bg-black/60 p-3.5 rounded-lg border border-white/[0.06] text-emerald-300 dark:text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[380px] select-all">
              {loading ? "Fetching live Prometheus exposition format..." : rawMetrics}
            </pre>
          </div>
        )}

        {/* Content: Parsed SRE Vitals */}
        {activeTab === "visual" && sreData && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-card-border bg-background/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Cache Hit Ratio</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {sreData.cache_hit_ratio_percent}%
                </p>
                <p className="text-[10px] text-muted">
                  L1: {sreData.l1_memory_hits} hits &bull; L2: {sreData.l2_redis_hits} hits
                </p>
              </div>

              <div className="p-3 rounded-lg border border-card-border bg-background/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Avg Ingestion Latency</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {sreData.avg_ingestion_latency_ms} ms
                </p>
                <p className="text-[10px] text-muted">
                  p95 estimate: ~{sreData.estimated_p95_latency_ms} ms
                </p>
              </div>

              <div className="p-3 rounded-lg border border-card-border bg-background/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Stream Worker Batch</span>
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {sreData.batch_buffer_size} ev/batch
                </p>
                <p className="text-[10px] text-muted">
                  Group: {sreData.stream_consumer_group}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-card-border bg-background/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-foreground font-medium">Uptime & Process State:</span>
                <span className="text-muted font-mono">{sreData.uptime_seconds}s online</span>
              </div>
              <span className="text-[11px] text-muted font-mono">
                Webhooks: {sreData.webhooks_delivered} delivered
              </span>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-card-border">
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
