import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { fetchReferrers } from "@/lib/api";
import { Globe, Search, ExternalLink, Compass, Link2 } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

export default function SourcesPage() {
  const { siteId } = useParams();
  const [sources, setSources] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"views" | "referrer">("views");

  useEffect(() => {
    async function load() {
      if (!siteId) return;
      setLoading(true);
      try {
        const data = await fetchReferrers(siteId, days);
        setSources(data || []);
      } catch (err) {
        console.error("Failed to load referrers", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId, days]);

  const filteredSources = useMemo(() => {
    return sources
      .filter((s) => s.referrer.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => {
        if (sortBy === "referrer") return a.referrer.localeCompare(b.referrer);
        return b.views - a.views;
      });
  }, [sources, searchQuery, sortBy]);

  const totalViews = useMemo(() => {
    return sources.reduce((acc, curr) => acc + (curr.views || 0), 0);
  }, [sources]);

  const directViews = useMemo(() => {
    const directObj = sources.find((s) => s.referrer.toLowerCase().includes("direct"));
    return directObj ? directObj.views : 0;
  }, [sources]);

  const directPct = useMemo(() => {
    if (totalViews === 0) return "0.0%";
    return `${((directViews / totalViews) * 100).toFixed(1)}%`;
  }, [totalViews, directViews]);

  return (
    <div className="space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              Traffic Origins & Referrer Domains
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Upstream traffic vectors, referral origins, and ingress source attribution.
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
            <span>Referral Ingress</span>
            <Globe className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{totalViews.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Attributed hits</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Distinct Domains</span>
            <Link2 className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{sources.length.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Referral hosts</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Direct / Untracked</span>
            <Compass className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{directPct}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Direct ingress share</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Filter referral hosts (e.g. google.com, github.com)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 rounded-md border border-card-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none"
          />
        </div>

        <CustomSelect
          value={sortBy}
          onChange={(val) => setSortBy(val as "views" | "referrer")}
          options={[
            { label: "Sort: Volume", value: "views" },
            { label: "Sort: Host Alpha", value: "referrer" },
          ]}
        />
      </div>

      {/* Sources Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-card-border text-[10px] font-medium text-muted uppercase tracking-wider bg-foreground/[0.01]">
          <span className="col-span-7">Origin / Referrer Domain</span>
          <span className="col-span-2 text-right">Volume</span>
          <span className="col-span-3 text-right">Traffic Share</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Ingesting origin metrics...</div>
        ) : filteredSources.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            {searchQuery ? "No matching referrer domains found." : "No referrer telemetry collected yet."}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredSources.map((source, idx) => {
              const percentage = totalViews > 0 ? ((source.views / totalViews) * 100).toFixed(1) : "0.0";
              const numericPct = Number(percentage) || 0;
              const isDirect = source.referrer.toLowerCase().includes("direct");
              return (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-2.5 hover:bg-foreground/[0.02] transition-colors">
                  <div className="col-span-7 flex items-center gap-2.5 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">{source.referrer}</span>
                    {!isDirect && (
                      <a
                        href={source.referrer.startsWith("http") ? source.referrer : `https://${source.referrer}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-foreground transition-colors"
                        title="Open external origin"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                    {source.views.toLocaleString()}
                  </span>
                  <div className="col-span-3 flex items-center justify-end gap-2 text-right">
                    <span className="text-xs font-mono text-muted tabular-nums">{percentage}%</span>
                    <div className="w-16 bg-foreground/[0.06] rounded-full h-1.5 overflow-hidden hidden sm:block">
                      <div className="bg-foreground/70 h-1.5 rounded-full transition-all duration-300" style={{ width: `${numericPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
