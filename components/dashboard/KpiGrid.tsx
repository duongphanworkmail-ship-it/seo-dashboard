"use client"

import { KpiCard } from "@/components/dashboard/KpiCard"

interface GscSummary {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface Ga4Summary {
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
}

interface KpiGridProps {
  gsc?: GscSummary | null
  ga4?: Ga4Summary | null
  loading?: boolean
}

export function KpiGrid({ gsc, ga4, loading }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Clicks"
        value={gsc ? gsc.clicks.toLocaleString() : "—"}
        sub="GSC"
        loading={loading}
      />
      <KpiCard
        label="Impressions"
        value={gsc ? gsc.impressions.toLocaleString() : "—"}
        sub="GSC"
        loading={loading}
      />
      <KpiCard
        label="Avg Position"
        value={gsc ? gsc.position.toFixed(1) : "—"}
        sub="GSC"
        loading={loading}
      />
      <KpiCard
        label="CTR"
        value={gsc ? `${gsc.ctr}%` : "—"}
        sub="GSC"
        loading={loading}
      />
      <KpiCard
        label="Sessions"
        value={ga4 ? ga4.sessions.toLocaleString() : "—"}
        sub="GA4"
        loading={loading}
      />
      <KpiCard
        label="Users"
        value={ga4 ? ga4.users.toLocaleString() : "—"}
        sub="GA4"
        loading={loading}
      />
      <KpiCard
        label="Pageviews"
        value={ga4 ? ga4.pageviews.toLocaleString() : "—"}
        sub="GA4"
        loading={loading}
      />
      <KpiCard
        label="Bounce Rate"
        value={ga4 ? `${ga4.bounceRate}%` : "—"}
        sub="GA4"
        loading={loading}
      />
    </div>
  )
}
