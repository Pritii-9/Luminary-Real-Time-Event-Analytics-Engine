"use client";

import { useState, use } from "react";
import { fetchPages, fetchReferrers, fetchDevices, fetchCustomEvents, fetchTimeseries } from "@/lib/api";
import { Download, FileSpreadsheet, FileJson, Calendar } from "lucide-react";
import Toast from "@/components/Toast";

export default function ExportPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
    setExporting(`${type}_${format}`);
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

      setToast({ message: `Exported ${type} data successfully.`, type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to export data.", type: "error" });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="max-w-5xl animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Export Analytics Data</h1>
        <p className="text-xs text-muted mt-1">
          Download your website's raw telemetry and aggregated reports in CSV or JSON format.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="rounded-xl border border-card-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Calendar className="h-4 w-4 text-muted" />
          <span>Select Time Period:</span>
        </div>
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
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">Top Pages & Paths</h3>
              <FileSpreadsheet className="h-4 w-4 text-muted" />
            </div>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Export page breakdown including path URLs and total pageviews.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("pages", "csv")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("pages", "json")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">Traffic Sources</h3>
              <FileSpreadsheet className="h-4 w-4 text-muted" />
            </div>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Export external referrers, direct traffic, and search engine acquisition channels.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("referrers", "csv")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("referrers", "json")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        </div>

        {/* Timeseries */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">Traffic Timeseries</h3>
              <FileSpreadsheet className="h-4 w-4 text-muted" />
            </div>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Daily aggregates of total pageviews and unique visitors over time.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("timeseries", "csv")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("timeseries", "json")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        </div>

        {/* Custom Events */}
        <div className="rounded-xl border border-card-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-foreground">Conversion Goals & Events</h3>
              <FileSpreadsheet className="h-4 w-4 text-muted" />
            </div>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Custom goal triggers, unique conversions, and event performance data.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("events", "csv")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              disabled={exporting !== null}
              onClick={() => handleExport("events", "json")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-card-border bg-background text-xs font-medium text-foreground hover:bg-white/5 cursor-pointer transition-colors"
            >
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
