"use client";;
import { useEffect, useState } from "react";
import { fetchYouTubeStats, fetchYouTubeEligibility, fetchAffiliateStats, YouTubeChannelStats, YouTubeEligibility, AffiliateStats } from "@/lib/api";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col p-4 rounded-lg border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
      <span className="text-xs text-text-secondary uppercase tracking-wider mb-1">{label}</span>
      <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</span>
      {sub && <span className="text-xs text-text-secondary mt-1">{sub}</span>}
    </div>
  );
}

function EligibilityBadge({ eligible, label }: { eligible: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: eligible ? "var(--success)" : "var(--text-secondary)" }}
      />
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-xs font-medium px-2 py-0.5 rounded" style={{
        backgroundColor: eligible ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)",
        color: eligible ? "var(--success)" : "var(--text-secondary)",
      }}>
        {eligible ? "Met" : "Not met"}
      </span>
    </div>
  );
}

export default function YouTubePage() {
  const [channelId, setChannelId] = useState("UCYourChannelIdHere");
  const [stats, setStats] = useState<YouTubeChannelStats | null>(null);
  const [eligibility, setEligibility] = useState<YouTubeEligibility | null>(null);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("UCYourChannelIdHere");

  async function loadChannel() {
    if (!channelId || channelId === "UCYourChannelIdHere") return;
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        fetchYouTubeStats(channelId),
        fetchYouTubeEligibility(channelId),
      ]);
      setStats(s);
      setEligibility(e);
    } catch {
      setStats(null);
      setEligibility(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Load affiliate stats once on mount
    fetchAffiliateStats()
      .then(setAffiliateStats)
      .catch(() => setAffiliateStats(null));
  }, []);

  return (
    <><div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-4">YouTube Analytics</h1>

          {/* Channel lookup */}
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setChannelId(inputValue.trim());
                  loadChannel();
                }
              }}
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1 px-4 py-2 rounded border text-sm"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            <button
              onClick={() => { setChannelId(inputValue.trim()); loadChannel(); }}
              disabled={loading}
              className="px-5 py-2 rounded font-medium text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)", color: "#fff" }}
            >
              {loading ? "Loading..." : "Lookup Channel"}
            </button>
          </div>

          {stats && (
            <>
              {/* Channel Stats */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Channel Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Subscribers" value={stats.subscriberCount.toLocaleString()} sub={stats.hiddenSubscriberCount ? "hidden" : undefined} />
                  <StatCard label="Total Views" value={stats.viewCount.toLocaleString()} />
                  <StatCard label="Videos" value={stats.videoCount.toLocaleString()} />
                  <StatCard label="Source" value={stats.source === "live" ? "Live" : "Unconfigured"} sub={stats.note} />
                </div>
              </div>

              {/* AdSense Eligibility */}
              {eligibility && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">AdSense Eligibility</h2>
                  <div
                    className="p-5 rounded-lg border"
                    style={{
                      backgroundColor: eligibility.monetizationEligible ? "rgba(16,185,129,0.05)" : "rgba(245,158,11,0.05)",
                      borderColor: eligibility.monetizationEligible ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: eligibility.monetizationEligible ? "var(--success)" : "var(--warning)" }}
                      />
                      <span className="font-semibold" style={{ color: eligibility.monetizationEligible ? "var(--success)" : "var(--warning)" }}>
                        {eligibility.monetizationEligible ? "Eligible for monetization" : "Not yet eligible for monetization"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-text-secondary mb-2">Requirements (1000 subs + 4000 watch hours)</div>
                        <div className="flex flex-col gap-2">
                          <EligibilityBadge eligible={eligibility.subsRequirementMet} label={`Subscribers: ${eligibility.subscriberCount.toLocaleString()} / 1,000`} />
                          <EligibilityBadge eligible={eligibility.watchHoursRequirementMet} label={`Watch hours: ${eligibility.watchHours.toLocaleString()} / 4,000`} />
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary">
                        <div>Watch hours method: {eligibility.watchHoursMethod}</div>
                        <div className="mt-1">Source: {eligibility.source}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!stats && !loading && (
            <div className="text-center py-12">
              <div className="text-text-secondary">Enter a YouTube channel ID above to check stats and AdSense eligibility.</div>
            </div>
          )}

          {/* Affiliate Stats */}
          {affiliateStats && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Affiliate Click Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <StatCard label="Total Clicks" value={affiliateStats.totalClicks.toLocaleString()} />
              </div>
              {affiliateStats.byProgram.length > 0 && (
                <div className="rounded-lg border p-4" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-xs text-text-secondary uppercase tracking-wider mb-2">Clicks by Program</div>
                  {affiliateStats.byProgram.map((p) => (
                    <div key={p.affiliate_program || "unknown"} className="flex justify-between text-sm py-1">
                      <span className="text-text-secondary">{p.affiliate_program || "Unknown"}</span>
                      <span style={{ color: "var(--text-primary)" }}>{p.click_count}</span>
                    </div>
                  ))}
                </div>
              )}
              {affiliateStats.daily.length > 0 && (
                <div className="rounded-lg border p-4 mt-3" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-xs text-text-secondary uppercase tracking-wider mb-2">Daily Clicks (this month)</div>
                  {affiliateStats.daily.slice(0, 10).map((d) => (
                    <div key={d.day} className="flex justify-between text-sm py-1">
                      <span className="text-text-secondary">{d.day}</span>
                      <span style={{ color: "var(--text-primary)" }}>{d.clicks}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </>
  );
}