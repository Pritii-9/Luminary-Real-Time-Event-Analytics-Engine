import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, BarChart3, Globe, Code, Plus, ExternalLink,
  MousePointer2, Download, Megaphone, Zap, FileText, ArrowRight,
} from "lucide-react";
import type { SiteData } from "@/lib/api";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  sites: SiteData[];
  onAddSite: () => void;
}

const GLOBAL_ACTIONS = [
  { id: "add-site", label: "Add New Site", icon: Plus, action: "add-site", category: "Actions" },
  { id: "go-sites", label: "Go to All Sites", icon: Globe, path: "/sites", category: "Navigate" },
];

const SITE_PAGES = [
  { key: "overview",  label: "Overview",       icon: BarChart3,    path: "" },
  { key: "pages",     label: "Pages",           icon: FileText,     path: "/pages" },
  { key: "sources",   label: "Sources",         icon: Globe,        path: "/sources" },
  { key: "campaigns", label: "Campaigns",       icon: Megaphone,    path: "/campaigns" },
  { key: "events",    label: "Events & Goals",  icon: Zap,          path: "/events" },
  { key: "replays",   label: "Session Replays", icon: MousePointer2,path: "/replays" },
  { key: "snippet",   label: "Snippet Setup",   icon: Code,         path: "/snippet" },
  { key: "export",    label: "Export Data",     icon: Download,     path: "/export" },
];

export default function CommandPalette({ open, onClose, sites, onAddSite }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items: Array<{
      id: string;
      label: string;
      sub?: string;
      icon: React.ElementType;
      category: string;
      onSelect: () => void;
    }> = [];

    // Global actions
    GLOBAL_ACTIONS.filter(a => !q || a.label.toLowerCase().includes(q)).forEach(a => {
      items.push({
        id: a.id,
        label: a.label,
        icon: a.icon,
        category: a.category,
        onSelect: () => {
          onClose();
          if (a.action === "add-site") onAddSite();
          else if (a.path) navigate(a.path);
        },
      });
    });

    // Site pages
    sites.forEach(site => {
      SITE_PAGES.filter(p => {
        if (!q) return true;
        return (
          site.name.toLowerCase().includes(q) ||
          site.domain.toLowerCase().includes(q) ||
          p.label.toLowerCase().includes(q)
        );
      }).slice(0, q ? undefined : 1).forEach(page => {
        items.push({
          id: `${site.site_id}-${page.key}`,
          label: q
            ? `${site.name} → ${page.label}`
            : `Open ${site.name}`,
          sub: site.domain,
          icon: page.icon,
          category: "Sites",
          onSelect: () => {
            onClose();
            navigate(`/dashboard/${site.site_id}${page.path}`);
          },
        });
      });
    });

    return items;
  }, [query, sites]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    results.forEach(r => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    });
    return map;
  }, [results]);

  // Flat list for keyboard nav
  const flat = useMemo(() => results, [results]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(p => Math.min(p + 1, flat.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(p => Math.max(p - 1, 0));
      }
      if (e.key === "Enter" && flat[selected]) {
        flat[selected].onSelect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flat, selected]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-card-border bg-card shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-card-border">
          <Search className="h-4 w-4 text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search sites, pages, actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="text-[10px] text-muted border border-card-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1.5">
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted">No results for "{query}"</div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
                  {category}
                </div>
                {items.map(item => {
                  const idx = flatIdx++;
                  const isSelected = selected === idx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={item.onSelect}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                        isSelected ? "bg-foreground/[0.07]" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-foreground/10 text-foreground" : "bg-background text-muted"
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-medium truncate ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                          {item.label}
                        </p>
                        {item.sub && (
                          <p className="text-[11px] text-muted truncate">{item.sub}</p>
                        )}
                      </div>
                      {isSelected && <ArrowRight className="h-3.5 w-3.5 text-muted flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-card-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted">
          <span><kbd className="font-mono border border-card-border rounded px-1 py-0.5">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono border border-card-border rounded px-1 py-0.5">↵</kbd> select</span>
          <span><kbd className="font-mono border border-card-border rounded px-1 py-0.5">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
