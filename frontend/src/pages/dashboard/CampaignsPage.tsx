import { useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Megaphone, Target, MousePointerClick, TrendingUp } from "lucide-react";
import { fetchUtm } from "../../lib/api";

export default function CampaignsPage() {
  const { siteId } = useParams();
  const [days, setDays] = useState(30);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    fetchUtm(siteId, days)
      .then((data) => {
        setCampaigns(data || []);
      })
      .catch(() => {
        setCampaigns([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [siteId, days]);

  const totalClicks = useMemo(() => {
    return campaigns.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  }, [campaigns]);

  const totalConversions = useMemo(() => {
    return campaigns.reduce((acc, curr) => acc + (curr.conversions || 0), 0);
  }, [campaigns]);

  const overallConversionRate = useMemo(() => {
    if (totalClicks === 0) return "0.0%";
    return `${((totalConversions / totalClicks) * 100).toFixed(1)}%`;
  }, [totalClicks, totalConversions]);

  return (
    <div className="space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              UTM Marketing Campaigns & Ad Ingress
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Attribution telemetry via <code className="font-mono text-foreground bg-foreground/[0.05] px-1 py-0.5 rounded border border-card-border">utm_source</code>, <code className="font-mono text-foreground bg-foreground/[0.05] px-1 py-0.5 rounded border border-card-border">utm_medium</code>, and <code className="font-mono text-foreground bg-foreground/[0.05] px-1 py-0.5 rounded border border-card-border">utm_campaign</code> tags.
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
            <span>Aggregated Ingress Clicks</span>
            <MousePointerClick className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{totalClicks.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Tagged UTM visits</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Tracked Campaigns</span>
            <Target className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{campaigns.length.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Unique campaigns</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Campaign Conversion</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{overallConversionRate}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Conversions: {totalConversions}</p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-card-border text-[10px] font-medium text-muted uppercase tracking-wider bg-foreground/[0.01]">
          <span className="col-span-4">Campaign Identifier</span>
          <span className="col-span-3">Source / Medium</span>
          <span className="col-span-2 text-right">Traffic Clicks</span>
          <span className="col-span-3 text-right">Conversions (Rate)</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Ingesting campaign telemetry...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No UTM campaign data recorded yet. Append parameters like <code className="font-mono text-foreground bg-foreground/[0.05] px-1 py-0.5 rounded border border-card-border">?utm_source=twitter&amp;utm_campaign=launch</code> to incoming URLs.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {campaigns.map((c, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-2.5 hover:bg-foreground/[0.02] transition-colors">
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <Megaphone className="h-3.5 w-3.5 text-muted shrink-0" />
                  <span className="text-xs font-mono font-medium text-foreground truncate">{c.campaign}</span>
                </div>
                <div className="col-span-3 text-xs text-muted font-mono truncate">
                  <span className="text-foreground">{c.source}</span> / <span>{c.medium}</span>
                </div>
                <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                  {c.clicks.toLocaleString()}
                </span>
                <div className="col-span-3 text-right text-xs">
                  <span className="font-semibold text-foreground tabular-nums">{c.conversions.toLocaleString()}</span>{" "}
                  <span className="text-muted font-mono text-[11px]">({c.convRate})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
