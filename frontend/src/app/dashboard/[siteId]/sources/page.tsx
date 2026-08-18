"use client";

import { useEffect, useState, use, useMemo } from "react";
import { fetchReferrers } from "@/lib/api";
import { Globe, Search, ExternalLink } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

export default function SourcesFeaturePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [sources, setSources] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"views" | "referrer">("views");

  useEffect(() => {
    async function load() {
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

  return (
    <div className="max-w-6xl animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Traffic Sources & Referrers</h1>
          <p className="text-xs text-muted mt-1">
            Discover where your visitors come from (Direct, Search, Social, Backlinks).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-card-border overflow-hidden">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  days === d
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search referrers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-md border border-card-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <CustomSelect
          value={sortBy}
          onChange={(val) => setSortBy(val as "views" | "referrer")}
          options={[
            { label: "Sort by Traffic", value: "views" },
            { label: "Sort by Name", value: "referrer" },
          ]}
        />
      </div>

      {/* Sources Table */}
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-card-border text-[10px] font-semibold text-muted uppercase tracking-wider">
          <span className="col-span-8">Referrer Domain / Source</span>
          <span className="col-span-2 text-right">Pageviews</span>
          <span className="col-span-2 text-right">% Contribution</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading referrer telemetry...</div>
        ) : filteredSources.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            {searchQuery ? "No matching sources found." : "No referrer data collected yet."}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredSources.map((source, idx) => {
              const percentage = totalViews > 0 ? ((source.views / totalViews) * 100).toFixed(1) : "0.0";
              const isDirect = source.referrer === "Direct / None";
              return (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-8 flex items-center gap-2.5 min-w-0">
                    <Globe className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">{source.referrer}</span>
                    {!isDirect && (
                      <a
                        href={`https://${source.referrer}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                    {source.views.toLocaleString()}
                  </span>
                  <div className="col-span-2 flex items-center justify-end gap-2 text-right">
                    <span className="text-xs font-medium text-muted tabular-nums">{percentage}%</span>
                    <div className="w-12 bg-background rounded-full h-1 overflow-hidden hidden sm:block border border-card-border">
                      <div className="bg-muted h-1 rounded-full" style={{ width: `${percentage}%` }} />
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
