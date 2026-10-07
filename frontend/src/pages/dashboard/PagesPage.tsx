import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { fetchPages } from "@/lib/api";
import { FileText, Search, Layers, Compass } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

export default function PagesPage() {
  const { siteId } = useParams();
  const [pages, setPages] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"views" | "path">("views");

  useEffect(() => {
    async function load() {
      if (!siteId) return;
      setLoading(true);
      try {
        const data = await fetchPages(siteId, days);
        setPages(data || []);
      } catch (err) {
        console.error("Failed to load page stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId, days]);

  const filteredPages = useMemo(() => {
    return pages
      .filter((p) => p.path.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .sort((a, b) => {
        if (sortBy === "path") return a.path.localeCompare(b.path);
        return b.views - a.views;
      });
  }, [pages, searchQuery, sortBy]);

  const totalViews = useMemo(() => {
    return pages.reduce((acc, curr) => acc + (curr.views || 0), 0);
  }, [pages]);

  const topRouteShare = useMemo(() => {
    if (pages.length === 0 || totalViews === 0) return "0.0%";
    const maxViews = Math.max(...pages.map((p) => p.views || 0));
    return `${((maxViews / totalViews) * 100).toFixed(1)}%`;
  }, [pages, totalViews]);

  return (
    <div className="space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-card-border">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-muted" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground uppercase">
              Route & Path Telemetry
            </h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Ingested URI endpoints, volume distribution, and traffic heat signatures.
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
            <span>Aggregated Pageviews</span>
            <FileText className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{totalViews.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Last {days} days</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Distinct Routes</span>
            <Layers className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{pages.length.toLocaleString()}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Mapped endpoints</p>
        </div>

        <div className="p-3.5 rounded-lg border border-card-border bg-card">
          <div className="flex items-center justify-between text-muted text-[10px] font-medium uppercase tracking-wider mb-1">
            <span>Top Path Concentration</span>
            <Compass className="h-3.5 w-3.5 text-muted" />
          </div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{topRouteShare}</p>
          <p className="text-[10px] text-muted mt-0.5 font-mono">Primary ingress route</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Filter endpoints by pattern (e.g. /docs, /api)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 rounded-md border border-card-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted/60 focus:border-foreground/40 focus:outline-none"
          />
        </div>

        <CustomSelect
          value={sortBy}
          onChange={(val) => setSortBy(val as "views" | "path")}
          options={[
            { label: "Sort: Volume", value: "views" },
            { label: "Sort: URI Alpha", value: "path" },
          ]}
        />
      </div>

      {/* Pages Table */}
      <div className="rounded-lg border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-card-border text-[10px] font-medium text-muted uppercase tracking-wider bg-foreground/[0.01]">
          <span className="col-span-7">Endpoint Path</span>
          <span className="col-span-2 text-right">Volume</span>
          <span className="col-span-3 text-right">Traffic Share</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Ingesting route metrics...</div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            {searchQuery ? "No matching endpoints found for query." : "No route telemetry collected yet."}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredPages.map((page, idx) => {
              const percentage = totalViews > 0 ? ((page.views / totalViews) * 100).toFixed(1) : "0.0";
              const numericPct = Number(percentage) || 0;
              return (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-2.5 hover:bg-foreground/[0.02] transition-colors">
                  <div className="col-span-7 flex items-center gap-2.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted/60 shrink-0" />
                    <span className="text-xs font-mono text-foreground truncate">{page.path}</span>
                  </div>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                    {page.views.toLocaleString()}
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
