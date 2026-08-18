"use client";

import { useState, use } from "react";
import { Megaphone } from "lucide-react";

export default function CampaignsFeaturePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const [days, setDays] = useState(30);

  // Mock campaign analytics data
  const campaigns = [
    { source: "google", medium: "cpc", campaign: "summer_sale_2026", clicks: 1420, conversions: 184, convRate: "12.9%" },
    { source: "newsletter", medium: "email", campaign: "weekly_digest_aug", clicks: 890, conversions: 92, convRate: "10.3%" },
    { source: "twitter", medium: "social", campaign: "product_launch_v2", clicks: 640, conversions: 48, convRate: "7.5%" },
    { source: "linkedin", medium: "paidsocial", campaign: "b2b_enterprise_q3", clicks: 310, conversions: 37, convRate: "11.9%" },
  ];

  return (
    <div className="max-w-6xl animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">UTM Marketing Campaigns</h1>
          <p className="text-xs text-muted mt-1">
            Track acquisition channels using standard <code className="text-foreground bg-card border border-card-border px-1 py-0.5 rounded font-mono">utm_source</code>, <code className="text-foreground bg-card border border-card-border px-1 py-0.5 rounded font-mono">utm_medium</code>, and <code className="text-foreground bg-card border border-card-border px-1 py-0.5 rounded font-mono">utm_campaign</code> parameters.
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

      {/* Campaigns Table */}
      <div className="rounded-xl border border-card-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-card-border text-[10px] font-semibold text-muted uppercase tracking-wider">
          <span className="col-span-4">Campaign Name</span>
          <span className="col-span-3">UTM Source / Medium</span>
          <span className="col-span-2 text-right">Traffic Clicks</span>
          <span className="col-span-3 text-right">Conversions (Rate)</span>
        </div>

        <div className="divide-y divide-border-subtle">
          {campaigns.map((c, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                <Megaphone className="h-3.5 w-3.5 text-muted shrink-0" />
                <span className="text-xs font-medium text-foreground font-mono truncate">{c.campaign}</span>
              </div>
              <div className="col-span-3 text-xs text-muted font-mono">
                <span className="text-foreground">{c.source}</span> / <span>{c.medium}</span>
              </div>
              <span className="col-span-2 text-xs font-semibold text-foreground text-right tabular-nums">
                {c.clicks.toLocaleString()}
              </span>
              <div className="col-span-3 text-right text-xs">
                <span className="font-semibold text-foreground tabular-nums">{c.conversions}</span>{" "}
                <span className="text-muted text-[11px]">({c.convRate})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
