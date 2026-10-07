import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Terminal,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  Search,
  Sparkles,
  Lock,
  Send,
  Activity,
  Layers,
  FileCode,
  X,
  Filter,
  Radio,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import {
  getCyberThreats,
  analyzeThreatWithLLM,
  queryTelemetryWithNL,
  simulateCyberThreats,
  getSreTelemetry,
  fetchRawPrometheusMetrics,
  testSecurityWebhook,
  API_URL,
  type CyberThreatIncident,
  type LLMIncidentReport,
  type NLQueryResult,
  type SreTelemetryData,
} from "@/lib/api";

export default function SecurityPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const [threats, setThreats] = useState<CyberThreatIncident[]>([]);
  const [sreData, setSreData] = useState<SreTelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<CyberThreatIncident | null>(null);
  const [llmReport, setLlmReport] = useState<LLMIncidentReport | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [activeRemediationTab, setActiveRemediationTab] = useState<"waf" | "terraform" | "patch">("waf");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // In-Page Collapsible Panels (Replaces intrusive centered popups)
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);
  const [showWebhookPanel, setShowWebhookPanel] = useState(false);
  const [rawMetrics, setRawMetrics] = useState<string>("");
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState("https://webhook.site/test-security-alert");
  const [webhookCategory, setWebhookCategory] = useState("SQL_INJECTION");
  const [webhookSending, setWebhookSending] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{
    status: string;
    signature_generated?: string;
    delivery_id?: string;
    error?: string;
  } | null>(null);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [nlResult, setNlResult] = useState<NLQueryResult | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [threatsData, telemetry] = await Promise.all([
        getCyberThreats(siteId, 50).catch(() => []),
        getSreTelemetry().catch(() => null),
      ]);
      setThreats(threatsData || []);
      if (telemetry) setSreData(telemetry);
    } catch (err) {
      console.error("Failed to load security telemetry", err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load raw metrics when metrics panel is toggled open
  useEffect(() => {
    if (showMetricsPanel && !rawMetrics) {
      setMetricsLoading(true);
      fetchRawPrometheusMetrics()
        .then((txt) => setRawMetrics(txt))
        .catch(() => setRawMetrics("# Telemetry stream connection failed. Ensure backend service is reachable."))
        .finally(() => setMetricsLoading(false));
    }
  }, [showMetricsPanel, rawMetrics]);

  const handleSimulate = async () => {
    if (!siteId) return;
    setSimulating(true);
    try {
      await simulateCyberThreats(siteId);
      await loadData();
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulating(false);
    }
  };

  const handleAnalyzeWithAI = async (incident: CyberThreatIncident) => {
    if (selectedIncident?.event_id === incident.event_id) {
      setSelectedIncident(null);
      return;
    }
    setSelectedIncident(incident);
    setLlmReport(null);
    setLlmLoading(true);
    setActiveRemediationTab("waf");
    try {
      const report = await analyzeThreatWithLLM({
        path: incident.path,
        threat_type: incident.threat_type,
        severity: incident.severity,
        raw_target: incident.raw_target,
        event_id: incident.event_id,
      });
      setLlmReport(report);
    } catch (err) {
      console.error("LLM analysis failed", err);
    } finally {
      setLlmLoading(false);
    }
  };

  const handleSendWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !webhookUrl.trim()) return;
    setWebhookSending(true);
    setWebhookResult(null);
    try {
      const res = await testSecurityWebhook(siteId, webhookUrl.trim(), webhookCategory);
      setWebhookResult(res);
      await loadData();
    } catch (err: any) {
      setWebhookResult({ status: "failed", error: err.message || "Network dispatch error" });
    } finally {
      setWebhookSending(false);
    }
  };

  const handleNLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !searchQuery.trim()) return;
    setNlLoading(true);
    try {
      const res = await queryTelemetryWithNL(siteId, searchQuery.trim());
      setNlResult(res);
    } catch (err) {
      console.error("NL Query failed", err);
    } finally {
      setNlLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Metrics
  const criticalCount = threats.filter((t) => t.severity === "CRITICAL").length;
  const highEntropyCount = threats.filter((t) => t.entropy > 4.5).length;

  // Filtered threats
  const filteredThreats = useMemo(() => {
    return threats.filter((t) => {
      // Category Filter
      if (selectedCategory === "CRITICAL" && t.severity !== "CRITICAL") return false;
      if (selectedCategory === "HIGH_ENTROPY" && t.entropy <= 4.5) return false;
      if (
        selectedCategory !== "ALL" &&
        selectedCategory !== "CRITICAL" &&
        selectedCategory !== "HIGH_ENTROPY" &&
        t.threat_type !== selectedCategory
      ) {
        return false;
      }

      // Search Query Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.path.toLowerCase().includes(q) ||
        t.ip.toLowerCase().includes(q) ||
        t.threat_type.toLowerCase().includes(q) ||
        (t.raw_target && t.raw_target.toLowerCase().includes(q))
      );
    });
  }, [threats, selectedCategory, searchQuery]);

  // Synthetic Terraform HCL generator
  const generateTerraformHcl = (incident: CyberThreatIncident) => {
    return `# Cloudflare Edge WAF Rate-Limiting Rule (Managed via Terraform)
resource "cloudflare_filter" "mitigate_${incident.threat_type.toLowerCase()}" {
  zone_id     = var.cloudflare_zone_id
  description = "Block heuristic exploit probe on ${incident.path}"
  expression  = "(http.request.uri.path contains \\"${incident.path}\\") or (cf.client.bot)"
}

resource "cloudflare_firewall_rule" "drop_${incident.threat_type.toLowerCase()}" {
  zone_id     = var.cloudflare_zone_id
  description = "Active Edge Mitigation for Incident ${incident.event_id || 'stream'}"
  filter_id   = cloudflare_filter.mitigate_${incident.threat_type.toLowerCase()}.id
  action      = "block"
  priority    = 1
}`;
  };

  return (
    <div className="space-y-5">
      {/* ── 1. HEADER ROW WITH ACTION CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              Threat Engine &amp; SRE Observability
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Real-time OWASP heuristic scanning, Shannon entropy analysis, and automated edge WAF mitigation.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-card-border bg-card hover:bg-foreground/[0.04] text-foreground transition-colors cursor-pointer disabled:opacity-50"
            title="Inject simulated OWASP telemetry to test detection"
          >
            <Zap className="h-3.5 w-3.5 text-muted" />
            <span>{simulating ? "Simulating..." : "Test Ingestion"}</span>
          </button>

          <button
            onClick={() => {
              setShowWebhookPanel(!showWebhookPanel);
              if (showMetricsPanel) setShowMetricsPanel(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              showWebhookPanel
                ? "bg-foreground text-background font-semibold border-foreground"
                : "border-card-border bg-card hover:bg-foreground/[0.04] text-foreground"
            }`}
            title="Dispatch HMAC-SHA256 signed alert to Slack, Discord, or SIEM"
          >
            <Send className="h-3.5 w-3.5" />
            <span>SIEM Alert</span>
          </button>

          <button
            onClick={() => {
              setShowMetricsPanel(!showMetricsPanel);
              if (showWebhookPanel) setShowWebhookPanel(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              showMetricsPanel
                ? "bg-foreground text-background font-semibold border-foreground"
                : "border-card-border bg-card hover:bg-foreground/[0.04] text-foreground"
            }`}
            title="Toggle live system metrics stream"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Metrics</span>
            <Activity className="h-3 w-3" />
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-xs font-medium rounded-md border border-card-border bg-card hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh incident telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. IN-PAGE LIVE METRICS CONSOLE (No intrusive popup) ── */}
      {showMetricsPanel && (
        <div className="rounded-lg border border-card-border bg-card overflow-hidden animate-fade-in space-y-0">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-card-border bg-foreground/[0.01]">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">Live Telemetry &amp; OpenMetrics Stream</span>
              <code className="text-[10px] text-muted bg-foreground/[0.04] px-1.5 py-0.5 rounded font-mono border border-card-border">/metrics</code>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(rawMetrics, "metrics_buf")}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded border border-card-border bg-background text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                {copiedKey === "metrics_buf" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "metrics_buf" ? "Copied" : "Copy Buffer"}</span>
              </button>
              <button
                onClick={() => setShowMetricsPanel(false)}
                className="text-muted hover:text-foreground p-1 rounded hover:bg-foreground/[0.04] transition-colors cursor-pointer"
                title="Close Metrics Panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#0d0e11] text-[#e1e4e8] font-mono text-xs max-h-56 overflow-y-auto leading-relaxed select-all">
            {metricsLoading ? (
              <div className="p-4 text-center text-zinc-500">Connecting to /metrics stream...</div>
            ) : (
              <pre className="whitespace-pre-wrap">{rawMetrics}</pre>
            )}
          </div>
        </div>
      )}

      {/* ── 3. IN-PAGE SIEM WEBHOOK DISPATCH (No intrusive popup) ── */}
      {showWebhookPanel && (
        <div className="rounded-lg border border-card-border bg-card p-4 animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-card-border pb-2">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-foreground">Dispatch SIEM Security Webhook (HMAC-SHA256)</span>
            </div>
            <button
              onClick={() => setShowWebhookPanel(false)}
              className="text-muted hover:text-foreground p-1 rounded hover:bg-foreground/[0.04] transition-colors cursor-pointer"
              title="Close Webhook Panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <form onSubmit={handleSendWebhook} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6 space-y-1">
              <label className="text-[11px] font-medium text-muted">Destination Webhook URL</label>
              <input
                type="url"
                required
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-2.5 py-1.5 rounded border border-card-border bg-background text-xs font-mono text-foreground focus:outline-none focus:border-foreground/40"
              />
            </div>

            <div className="md:col-span-4 space-y-1">
              <label className="text-[11px] font-medium text-muted">Test Incident Payload</label>
              <select
                value={webhookCategory}
                onChange={(e) => setWebhookCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-card-border bg-background text-xs font-medium text-foreground focus:outline-none cursor-pointer"
              >
                <option value="SQL_INJECTION">SQL Injection Probe</option>
                <option value="REMOTE_CODE_EXECUTION">Remote Code Execution</option>
                <option value="PATH_TRAVERSAL">Directory Traversal</option>
                <option value="HIGH_ENTROPY_PAYLOAD">High Shannon Entropy</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={webhookSending}
                className="w-full py-1.5 px-3 rounded text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {webhookSending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                <span>{webhookSending ? "Sending..." : "Dispatch"}</span>
              </button>
            </div>
          </form>

          {webhookResult && (
            <div className={`p-2.5 rounded border text-xs font-mono flex items-center justify-between ${
              webhookResult.status === "delivered" || webhookResult.status === "dispatched"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}>
              <span>Status: {webhookResult.status} {webhookResult.delivery_id ? `• Delivery ID: ${webhookResult.delivery_id}` : ""}</span>
              {webhookResult.signature_generated && (
                <span className="text-[10px] text-muted">Sig: {webhookResult.signature_generated.slice(0, 14)}...</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 4. UNIFIED 4-CARD SRE TELEMETRY STRIP ── */}
      {sreData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Ingestion & Active Defense */}
          <div className="p-3.5 rounded-lg border border-card-border bg-card hover:bg-foreground/[0.02] transition-colors">
            <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
              <span>Ingestion Latency</span>
              <Activity className="h-3.5 w-3.5 text-muted" />
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {sreData.avg_ingestion_latency_ms} <span className="text-xs font-normal text-muted">ms</span>
            </p>
            <p className="text-[10px] text-muted mt-0.5 font-mono">
              p95: ~{sreData.estimated_p95_latency_ms} ms &bull; Active Defense On
            </p>
          </div>

          {/* Card 2: Two-Tier Cache Efficiency */}
          <div className="p-3.5 rounded-lg border border-card-border bg-card hover:bg-foreground/[0.02] transition-colors">
            <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
              <span>Cache Hit Ratio</span>
              <Layers className="h-3.5 w-3.5 text-muted" />
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {sreData.cache_hit_ratio_percent}%
            </p>
            <p className="text-[10px] text-muted mt-0.5 font-mono">
              L1: {sreData.l1_memory_hits} &bull; L2 Redis: {sreData.l2_redis_hits}
            </p>
          </div>

          {/* Card 3: Critical Exploits */}
          <div className="p-3.5 rounded-lg border border-card-border bg-card hover:bg-foreground/[0.02] transition-colors">
            <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
              <span>Threat Incidents</span>
              <AlertTriangle className={`h-3.5 w-3.5 ${criticalCount > 0 ? "text-danger" : "text-muted"}`} />
            </div>
            <p className={`text-lg font-semibold tabular-nums ${criticalCount > 0 ? "text-danger" : "text-foreground"}`}>
              {criticalCount > 0 ? `${criticalCount} Critical` : "0 Exploits"}
            </p>
            <p className="text-[10px] text-muted mt-0.5 font-mono">
              {threats.length} Scanned &bull; SQLi, RCE, SSRF
            </p>
          </div>

          {/* Card 4: Shannon Payload Entropy */}
          <div className="p-3.5 rounded-lg border border-card-border bg-card hover:bg-foreground/[0.02] transition-colors">
            <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
              <span>Payload Entropy</span>
              <Cpu className="h-3.5 w-3.5 text-muted" />
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {highEntropyCount > 0 ? `${highEntropyCount} Obfuscated` : "Normal Range"}
            </p>
            <p className="text-[10px] text-muted mt-0.5 font-mono">
              Shannon H &gt; 4.5 &bull; {sreData.batch_buffer_size} ev/batch
            </p>
          </div>
        </div>
      )}

      {/* ── 5. SEARCH & TRIAGE BAR ── */}
      <div className="space-y-2.5">
        <form onSubmit={handleNLSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by target path, IP, or enter plain English query (e.g. 'Show SQL injection attempts')..."
              className="w-full bg-card border border-card-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-foreground/40 font-mono transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={nlLoading || !searchQuery.trim()}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center gap-1.5 flex-shrink-0"
            title="Run Groq Llama 3.1 AI reasoning query"
          >
            {nlLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>Ask AI</span>
          </button>
        </form>

        {/* Quick Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
          <span className="text-muted flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {[
            { id: "ALL", label: `All (${threats.length})` },
            { id: "CRITICAL", label: `Critical (${criticalCount})` },
            { id: "HIGH_ENTROPY", label: `High Entropy (${highEntropyCount})` },
            { id: "SQL_INJECTION", label: "SQL Injection" },
            { id: "XSS_ATTACK", label: "XSS" },
            { id: "PATH_TRAVERSAL", label: "Traversal" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                selectedCategory === cat.id
                  ? "bg-foreground text-background font-semibold border-foreground"
                  : "bg-card border-card-border text-muted hover:text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* AI Insight Box (Dismissible) */}
        {nlResult && (
          <div className="p-3.5 rounded-lg bg-card border border-card-border space-y-2 text-xs animate-fade-in relative">
            <button
              onClick={() => setNlResult(null)}
              className="absolute top-2.5 right-2.5 text-muted hover:text-foreground p-1 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2 text-muted text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>AI Triage Summary: <strong className="text-foreground">{nlResult.interpreted_intent}</strong></span>
              <span>&bull; {nlResult.result_count} records</span>
            </div>
            <p className="text-foreground leading-relaxed pr-6">{nlResult.ai_summary}</p>
            <p className="text-[11px] text-muted font-mono pt-1.5 border-t border-card-border">
              💡 Recommended Action: {nlResult.recommended_action}
            </p>
          </div>
        )}
      </div>

      {/* ── 6. INCIDENT STREAM TABLE ── */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-card-border flex items-center justify-between bg-foreground/[0.01]">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-muted" />
            <h2 className="text-[10px] font-medium text-muted uppercase tracking-wider">
              Real-Time Incident Stream
            </h2>
          </div>
          <span className="text-[11px] text-muted font-mono">
            Showing {filteredThreats.length} of {threats.length} logged events
          </span>
        </div>

        {filteredThreats.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <ShieldCheck className="h-8 w-8 text-success mx-auto" />
            <p className="text-sm font-semibold text-foreground">
              {searchQuery ? "No matching threat events found" : "Zero malicious exploits detected"}
            </p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {searchQuery
                ? "Try adjusting your search terms or filter criteria."
                : "Continuous telemetry inspection is operational. Click below to inject test vectors."}
            </p>
            {!searchQuery && (
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="mt-1 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
              >
                Inject Test Payload
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-card-border bg-foreground/[0.01] text-muted text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-medium">Timestamp / IP</th>
                  <th className="py-2.5 px-4 font-medium">Threat Category</th>
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Entropy</th>
                  <th className="py-2.5 px-4 font-medium">Target Path &amp; Probe</th>
                  <th className="py-2.5 px-4 font-medium text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono text-[11px]">
                {filteredThreats.map((incident, idx) => {
                  const isCrit = incident.severity === "CRITICAL";
                  const isHigh = incident.severity === "HIGH";
                  const isInspected = selectedIncident?.event_id === incident.event_id;
                  return (
                    <React.Fragment key={incident.event_id || idx}>
                      <tr
                        onClick={() => handleAnalyzeWithAI(incident)}
                        className={`cursor-pointer transition-colors ${
                          isInspected
                            ? "bg-foreground/[0.05]"
                            : "hover:bg-foreground/[0.02]"
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-sans text-foreground font-medium text-xs">
                            {new Date(incident.timestamp * 1000).toLocaleTimeString()}
                          </div>
                          <div className="text-[10px] text-muted">{incident.ip}</div>
                        </td>

                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] bg-foreground/[0.04] text-foreground border border-card-border">
                            {incident.threat_type}
                          </span>
                        </td>

                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-sans text-[10px] font-semibold border ${
                              isCrit
                                ? "bg-danger/10 text-danger border-danger/20"
                                : isHigh
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}
                          >
                            {incident.severity}
                          </span>
                        </td>

                        <td className="py-2.5 px-4">
                          <span
                            className={`font-mono text-[11px] tabular-nums ${
                              incident.entropy > 4.5
                                ? "text-amber-500 font-bold"
                                : "text-muted"
                            }`}
                          >
                            {incident.entropy.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 max-w-sm truncate" title={incident.raw_target}>
                          <span className="text-muted font-mono">{incident.path}</span>
                          <div className="text-[10px] text-foreground/80 truncate font-mono mt-0.5">
                            {incident.raw_target}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeWithAI(incident);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-sans font-medium rounded border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              isInspected
                                ? "bg-foreground text-background font-semibold border-foreground"
                                : "border-card-border bg-background hover:bg-foreground/[0.04] text-foreground"
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>{isInspected ? "Collapse" : "Inspect"}</span>
                          </button>
                        </td>
                      </tr>

                      {/* ── IN-PLACE ACCORDION INSPECTION ROW (No outsider box) ── */}
                      {isInspected && (
                        <tr className="bg-foreground/[0.01]">
                          <td colSpan={6} className="p-3 sm:p-4">
                            <div className="rounded-lg border border-card-border bg-card p-4 space-y-3 shadow-xs animate-fade-in text-left font-sans">
                              {/* Header */}
                              <div className="flex items-center justify-between pb-2.5 border-b border-card-border">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="p-1 rounded bg-foreground/[0.04] border border-card-border">
                                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                                  </span>
                                  <span className="text-xs font-semibold text-foreground">
                                    Incident Remediation Briefing
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-card-border bg-foreground/[0.04] text-foreground font-semibold">
                                    {incident.threat_type}
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                                      incident.severity === "CRITICAL"
                                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    }`}
                                  >
                                    {incident.severity}
                                  </span>
                                  <span className="text-[11px] text-muted font-mono">
                                    Path: <strong className="text-foreground">{incident.path}</strong> &bull; Client: {incident.ip} &bull; Entropy: {incident.entropy.toFixed(2)}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedIncident(null);
                                  }}
                                  className="px-2 py-0.5 text-xs text-muted hover:text-foreground rounded border border-card-border bg-background hover:bg-foreground/[0.04] transition-colors cursor-pointer flex items-center gap-1 font-sans"
                                  title="Collapse Inspector"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Close</span>
                                </button>
                              </div>

                              {/* Body */}
                              {llmLoading ? (
                                <div className="p-6 text-center space-y-2">
                                  <RefreshCw className="h-4 w-4 text-muted animate-spin mx-auto" />
                                  <p className="text-xs text-muted font-mono">
                                    Synthesizing root cause &amp; edge mitigations via Groq Cloud reasoning engine...
                                  </p>
                                </div>
                              ) : llmReport ? (
                                <div className="space-y-3 font-sans">
                                  {/* Root Cause Summary */}
                                  <div className="p-3 rounded-md border border-card-border bg-foreground/[0.02] space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                                        Root Cause Telemetry
                                      </span>
                                      {llmReport.ai_engine && (
                                        <span className="text-[10px] text-muted font-mono">{llmReport.ai_engine}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-foreground leading-relaxed font-sans">
                                      {llmReport.attack_mechanism || "Pattern heuristic anomaly detected on ingress endpoint."}
                                    </p>
                                  </div>

                                  {/* Remediation Tabs */}
                                  <div className="flex items-center gap-1 border-b border-card-border text-xs">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveRemediationTab("waf");
                                      }}
                                      className={`pb-1.5 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
                                        activeRemediationTab === "waf"
                                          ? "border-emerald-400 text-emerald-400 font-semibold"
                                          : "border-transparent text-muted hover:text-foreground"
                                      }`}
                                    >
                                      Edge WAF Rule
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveRemediationTab("terraform");
                                      }}
                                      className={`pb-1.5 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
                                        activeRemediationTab === "terraform"
                                          ? "border-purple-400 text-purple-400 font-semibold"
                                          : "border-transparent text-muted hover:text-foreground"
                                      }`}
                                    >
                                      Terraform IaC
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveRemediationTab("patch");
                                      }}
                                      className={`pb-1.5 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
                                        activeRemediationTab === "patch"
                                          ? "border-cyan-400 text-cyan-400 font-semibold"
                                          : "border-transparent text-muted hover:text-foreground"
                                      }`}
                                    >
                                      Code Fix Patch
                                    </button>
                                  </div>

                                  {/* Tab 1: WAF Rule */}
                                  {activeRemediationTab === "waf" && (
                                    <div className="rounded border border-card-border overflow-hidden">
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-foreground/[0.02] border-b border-card-border">
                                        <span className="text-[10px] font-mono text-muted uppercase">Cloudflare Edge Rule</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(llmReport.waf_rule, "waf");
                                          }}
                                          className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer font-mono"
                                        >
                                          {copiedKey === "waf" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                          <span>{copiedKey === "waf" ? "Copied" : "Copy"}</span>
                                        </button>
                                      </div>
                                      <pre className="p-3 bg-[#0d0e11] text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all">
                                        {llmReport.waf_rule}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Tab 2: Terraform IaC */}
                                  {activeRemediationTab === "terraform" && (
                                    <div className="rounded border border-card-border overflow-hidden">
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-foreground/[0.02] border-b border-card-border">
                                        <span className="text-[10px] font-mono text-muted uppercase">Terraform Provider HCL</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(generateTerraformHcl(incident), "tf");
                                          }}
                                          className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer font-mono"
                                        >
                                          {copiedKey === "tf" ? <Check className="h-3 w-3 text-purple-400" /> : <Copy className="h-3 w-3" />}
                                          <span>{copiedKey === "tf" ? "Copied" : "Copy"}</span>
                                        </button>
                                      </div>
                                      <pre className="p-3 bg-[#0d0e11] text-purple-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all">
                                        {generateTerraformHcl(incident)}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Tab 3: Code Patch */}
                                  {activeRemediationTab === "patch" && (
                                    <div className="rounded border border-card-border overflow-hidden">
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-foreground/[0.02] border-b border-card-border">
                                        <span className="text-[10px] font-mono text-muted uppercase">Backend Handler Fix</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(llmReport.code_fix, "code");
                                          }}
                                          className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer font-mono"
                                        >
                                          {copiedKey === "code" ? <Check className="h-3 w-3 text-cyan-400" /> : <Copy className="h-3 w-3" />}
                                          <span>{copiedKey === "code" ? "Copied" : "Copy"}</span>
                                        </button>
                                      </div>
                                      <pre className="p-3 bg-[#0d0e11] text-cyan-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all">
                                        {llmReport.code_fix}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
