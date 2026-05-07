"use client"

import { useState, useEffect } from "react"

interface GscDetailPanelProps {
  propertyId: string
  startDate: string
  endDate: string
  device: string
  filterDimension: "page" | "query"
  filterValue: string
  onClose: () => void
}

const CONFIG = {
  page: {
    panelTitle: "Page Detail",
    relatedDim: "query",
    relatedColHeader: "Query",
    relatedTableTitle: "Top queries for this page",
  },
  query: {
    panelTitle: "Query Detail",
    relatedDim: "page",
    relatedColHeader: "Page",
    relatedTableTitle: "Pages ranking for this query",
  },
}

interface SummaryData { clicks: number; impressions: number; ctr: number; position: number }
interface RelatedRow { [key: string]: unknown; clicks: number; impressions: number; ctr: number; position: number }

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-bold text-gray-900">{value}</p>
    </div>
  )
}

export function GscDetailPanel({
  propertyId, startDate, endDate, device,
  filterDimension, filterValue, onClose,
}: GscDetailPanelProps) {
  const cfg = CONFIG[filterDimension]
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [related, setRelated] = useState<RelatedRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const base = new URLSearchParams({ propertyId, startDate, endDate, device })
      base.set("filterDimension", filterDimension)
      base.set("filterValue", filterValue)

      const relatedParams = new URLSearchParams(base)
      relatedParams.set("groupBy", cfg.relatedDim)
      relatedParams.set("limit", "10")

      const [sumRes, relRes] = await Promise.all([
        fetch(`/api/gsc/summary?${base}`),
        fetch(`/api/gsc/queries?${relatedParams}`),
      ])
      if (sumRes.ok) setSummary(await sumRes.json())
      if (relRes.ok) {
        const d = await relRes.json()
        setRelated(d.rows ?? [])
      }
      setLoading(false)
    }
    load()
  }, [propertyId, startDate, endDate, device, filterDimension, filterValue, cfg.relatedDim])

  const accentColor = filterDimension === "query" ? "blue" : "indigo"
  const borderCls = accentColor === "blue" ? "border-blue-200 bg-blue-50/60" : "border-indigo-200 bg-indigo-50/60"
  const titleCls = accentColor === "blue" ? "text-blue-700" : "text-indigo-700"

  return (
    <div className={`border-t-2 ${borderCls} p-4 space-y-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-xs font-semibold ${titleCls} uppercase tracking-wide`}>{cfg.panelTitle}</p>
          <p className="text-sm font-medium text-gray-800 break-all">{filterValue}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 border border-gray-200 rounded-lg bg-white shrink-0"
        >
          Close
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKpi label="Clicks"      value={summary ? summary.clicks.toLocaleString() : "—"} />
          <MiniKpi label="Impressions" value={summary ? summary.impressions.toLocaleString() : "—"} />
          <MiniKpi label="CTR"         value={summary ? `${summary.ctr}%` : "—"} />
          <MiniKpi label="Position"    value={summary ? summary.position.toFixed(1) : "—"} />
        </div>
      )}

      {!loading && related.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{cfg.relatedTableTitle}</p>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{cfg.relatedColHeader}</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Clicks</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Impressions</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">CTR</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {related.map((r, i) => {
                  const dimVal = String(r[cfg.relatedDim] ?? "")
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 font-medium text-gray-800 max-w-xs truncate">{dimVal}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{r.clicks.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{r.impressions.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{Number(r.ctr).toFixed(2)}%</td>
                      <td className="px-3 py-1.5 text-right text-gray-600">{Number(r.position).toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
