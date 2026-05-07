"use client"

import { useState, useEffect } from "react"

interface DrillRow {
  [key: string]: unknown
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
}

interface MiniTableProps {
  title: string
  dim: string
  dimLabel: string
  propertyId: string
  startDate: string
  endDate: string
  device: string
  filterDimension: string
  filterValue: string
}

const DRILL_MAP: Record<string, Array<{ dim: string; label: string; dimLabel: string }>> = {
  pagePath:                   [{ dim: "sessionDefaultChannelGroup", label: "Channels",    dimLabel: "Channel" },
                               { dim: "deviceCategory",             label: "Devices",     dimLabel: "Device" }],
  pageTitle:                  [{ dim: "pagePath",                   label: "Pages",       dimLabel: "Page" },
                               { dim: "sessionDefaultChannelGroup", label: "Channels",    dimLabel: "Channel" }],
  sessionSource:              [{ dim: "pagePath",                   label: "Top Pages",   dimLabel: "Page" },
                               { dim: "deviceCategory",             label: "Devices",     dimLabel: "Device" }],
  country:                    [{ dim: "sessionDefaultChannelGroup", label: "Channels",    dimLabel: "Channel" },
                               { dim: "deviceCategory",             label: "Devices",     dimLabel: "Device" }],
  deviceCategory:             [{ dim: "pagePath",                   label: "Top Pages",   dimLabel: "Page" },
                               { dim: "sessionDefaultChannelGroup", label: "Channels",    dimLabel: "Channel" }],
  sessionDefaultChannelGroup: [{ dim: "pagePath",                   label: "Top Pages",   dimLabel: "Page" },
                               { dim: "sessionSource",              label: "Sources",     dimLabel: "Source" }],
}

function MiniTable({ title, dim, dimLabel, propertyId, startDate, endDate, device, filterDimension, filterValue }: MiniTableProps) {
  const [rows, setRows] = useState<DrillRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const q = new URLSearchParams({
        propertyId, startDate, endDate, device,
        groupBy: dim,
        filterDimension,
        filterValue,
        limit: "5",
      })
      const res = await fetch(`/api/ga4/pages?${q}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows ?? [])
      }
      setLoading(false)
    }
    load()
  }, [propertyId, startDate, endDate, device, dim, filterDimension, filterValue])

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400 text-center">No data</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{dimLabel}</th>
                <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Sessions</th>
                <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-medium text-gray-800 max-w-[180px] truncate">
                    {String(r[dim] ?? "")}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-600">{r.sessions.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right text-gray-600">{r.users.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

interface Ga4DrillPanelProps {
  propertyId: string
  startDate: string
  endDate: string
  device: string
  sourceDim: string
  sourceValue: string
  onClose: () => void
}

const DIM_LABELS: Record<string, string> = {
  pagePath: "Page",
  pageTitle: "Page Title",
  sessionSource: "Source",
  country: "Country",
  deviceCategory: "Device",
  sessionDefaultChannelGroup: "Channel",
}

export function Ga4DrillPanel({
  propertyId, startDate, endDate, device,
  sourceDim, sourceValue, onClose,
}: Ga4DrillPanelProps) {
  const drillDims = DRILL_MAP[sourceDim] ?? []

  return (
    <div className="border-t-2 border-purple-200 bg-purple-50/50 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
            {DIM_LABELS[sourceDim] ?? sourceDim} Breakdown
          </p>
          <p className="text-sm font-medium text-gray-800 break-all">{sourceValue}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 border border-gray-200 rounded-lg bg-white"
        >
          Close
        </button>
      </div>

      {drillDims.length === 0 ? (
        <p className="text-xs text-gray-400">No drill-down available for this dimension.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4">
          {drillDims.map((d) => (
            <MiniTable
              key={d.dim}
              title={d.label}
              dim={d.dim}
              dimLabel={d.dimLabel}
              propertyId={propertyId}
              startDate={startDate}
              endDate={endDate}
              device={device}
              filterDimension={sourceDim}
              filterValue={sourceValue}
            />
          ))}
        </div>
      )}
    </div>
  )
}
