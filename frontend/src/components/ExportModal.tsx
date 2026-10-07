import { useState } from "react";
import { X, Download, FileSpreadsheet, FileJson, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchPages, fetchReferrers, fetchDevices, fetchCustomEvents, fetchTimeseries } from "@/lib/api";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  defaultDays?: number;
}

export default function ExportModal({
  isOpen,
  onClose,
  siteId,
  defaultDays = 30,
}: ExportModalProps) {
  const [days, setDays] = useState(defaultDays);
  const [exporting, setExporting] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  if (!isOpen) return null;

  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${siteId}_${days}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = (filename: string, data: any) => {
    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonContent);
    link.setAttribute("download", `${filename}_${siteId}_${days}d.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (type: "pages" | "referrers" | "devices" | "events" | "timeseries", format: "csv" | "json") => {
    const key = `${type}_${format}`;
    setExporting(key);
    setStatusMsg(null);
    try {
      let data: any[] = [];
      let headers: string[] = [];

      if (type === "pages") {
        data = await fetchPages(siteId, days);
        headers = ["Path", "Pageviews"];
      } else if (type === "referrers") {
        data = await fetchReferrers(siteId, days);
        headers = ["Referrer Source", "Pageviews"];
      } else if (type === "devices") {
        data = await fetchDevices(siteId, days);
        headers = ["Device Type", "Pageviews"];
      } else if (type === "events") {
        data = await fetchCustomEvents(siteId, days);
        headers = ["Event Name", "Total Count", "Unique Visitors"];
      } else if (type === "timeseries") {
        data = await fetchTimeseries(siteId, days);
        headers = ["Date", "Pageviews", "Visitors"];
      }

      if (format === "csv") {
        const rows = data.map((item) => Object.values(item) as (string | number)[]);
        downloadCSV(type, headers, rows);
      } else {
        downloadJSON(type, data);
      }

      setStatusMsg({ text: `Exported ${type} (${format.toUpperCase()}) successfully!` });
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to export data.", error: true });
    } finally {
      setExporting(null);
    }
  };

  const EXPORT_DATASETS = [
    {
      key: "pages" as const,
      title: "Pageviews & Top Paths",
      desc: "URL path traffic, visitor counts, and pageview volumes.",
    },
    {
      key: "referrers" as const,
      title: "Traffic Sources & Channels",
      desc: "Referrer domains, search engines, and direct visitor shares.",
    },
    {
      key: "devices" as const,
      title: "Device & Platform Distribution",
      desc: "Desktop, mobile, and tablet browser breakdown.",
    },
    {
      key: "events" as const,
      title: "Custom Events & Conversions",
      desc: "Triggered custom actions, button clicks, and goal metrics.",
    },
    {
      key: "timeseries" as const,
      title: "Daily Time-Series Telemetry",
      desc: "Day-by-day aggregated pageviews and unique visitor counts.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-xl rounded-xl border border-card-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-foreground/10 border border-foreground/15 flex items-center justify-center text-foreground">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Export Analytics Telemetry</h2>
            <p className="text-xs text-muted">Download production telemetry datasets in CSV or JSON</p>
          </div>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 animate-fade-in ${
              statusMsg.error
                ? "bg-red-500/10 border-red-500/20 text-red-300"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            }`}
          >
            {statusMsg.error ? (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Period Selector */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-card-border bg-background/50 mb-5">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted" />
            <span>Time Window:</span>
          </div>
          <div className="flex rounded-md border border-card-border overflow-hidden">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  days === d
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Datasets */}
        <div className="space-y-3">
          {EXPORT_DATASETS.map((ds) => {
            const isCsvLoading = exporting === `${ds.key}_csv`;
            const isJsonLoading = exporting === `${ds.key}_json`;

            return (
              <div
                key={ds.key}
                className="flex items-center justify-between p-3.5 rounded-lg border border-card-border bg-background/40 hover:bg-foreground/[0.03] transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <h4 className="text-xs font-semibold text-foreground">{ds.title}</h4>
                  <p className="text-[11px] text-muted truncate mt-0.5">{ds.desc}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    disabled={!!exporting}
                    onClick={() => handleExport(ds.key, "csv")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-card-border bg-card hover:bg-white/5 text-[11px] font-medium text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                    <span>{isCsvLoading ? "Exporting..." : "CSV"}</span>
                  </button>
                  <button
                    disabled={!!exporting}
                    onClick={() => handleExport(ds.key, "json")}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-card-border bg-card hover:bg-white/5 text-[11px] font-medium text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <FileJson className="h-3 w-3 text-cyan-400" />
                    <span>{isJsonLoading ? "Exporting..." : "JSON"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
