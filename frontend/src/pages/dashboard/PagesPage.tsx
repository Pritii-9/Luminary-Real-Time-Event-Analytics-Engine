import { useParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from "react";
import { fetchPages } from "@/lib/api";
import { FileText, Search } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

export default function PagesPage() {
  const {  siteId  } = useParams();
  const [pages, setPages] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"views" | "path">("views");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchPages(siteId as string as string, days);
        setPages(data || []);
      } catch (err) {
        console.error("Failed to load page stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId as string, days]);

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

  return (
    <div className="max-w-6xl animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Top Pages & Paths</h1>
          <p className="text-xs text-muted mt-1">
            Detailed breakdown of page URLs visited by your users.
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
            placeholder="Search page paths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-md border border-card-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <CustomSelect
          value={sortBy}
          onChange={(val) => setSortBy(val as "views" | "path")}
          options={[
            { label: "Sort by Views", value: "views" },
            { label: "Sort by Path", value: "path" },
          ]}
        />
      </div>

      {/* Pages Table */}
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-card-border text-[10px] font-semibold text-muted uppercase tracking-wider">
          <span className="col-span-8">Page Path</span>
          <span className="col-span-2 text-right">Pageviews</span>
          <span className="col-span-2 text-right">% Traffic</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading page telemetry...</div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            {searchQuery ? "No matching pages found." : "No page data collected yet."}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredPages.map((page, idx) => {
              const percentage = totalViews > 0 ? ((page.views / totalViews) * 100).toFixed(1) : "0.0";
              return (
                <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-8 flex items-center gap-2.5 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-xs font-mono text-foreground truncate">{page.path}</span>
                  </div>
                  <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                    {page.views.toLocaleString()}
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
