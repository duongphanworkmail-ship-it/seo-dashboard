"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { Card } from "@/components/ui/Card"

interface RawPoint  { date: string; clicks: number; impressions: number; ctr: number }
interface ChartPoint extends RawPoint {
  rawDate: string
  cmpDate?: string
  clicks_cmp?: number
  impressions_cmp?: number
  ctr_cmp?: number
}

interface GscTrendChartProps {
  propertyId: string
  startDate: string
  endDate: string
  device: string
  selectedDate?: string | null
  onDateSelect?: (date: string | null) => void
  compareStart?: string
  compareEnd?: string
}

const METRICS = [
  { key: "clicks",      label: "Clicks",      color: "#3b82f6", axis: "left"  as const },
  { key: "impressions", label: "Impressions",  color: "#94a3b8", axis: "left"  as const },
  { key: "ctr",         label: "CTR (%)",      color: "#f97316", axis: "right" as const },
]

function fmtDate(d: string) {
  const [, m, day] = d.split("-")
  return `${day}/${m}`
}

function sortAndFormat(rows: RawPoint[]) {
  return [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ ...r, rawDate: r.date, date: fmtDate(r.date) }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CmpTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const point: ChartPoint = payload[0]?.payload
  const current = payload.filter((p: { dataKey: string }) => !String(p.dataKey).endsWith("_cmp"))
  const compare = payload.filter((p: { dataKey: string }) =>  String(p.dataKey).endsWith("_cmp"))
  const isCtr   = (key: string) => key === "ctr" || key === "ctr_cmp"
  const fmt     = (v: unknown, key: string) => isCtr(key) ? `${Number(v).toFixed(2)}%` : Number(v).toLocaleString()
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {current.map((p: { dataKey: string; name: string; value: unknown; stroke: string }) => (
        <p key={p.dataKey} style={{ color: p.stroke }}>{p.name}: {fmt(p.value, p.dataKey)}</p>
      ))}
      {compare.length > 0 && point?.cmpDate && (
        <>
          <p className="text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100 font-medium">{point.cmpDate} (prev)</p>
          {compare.map((p: { dataKey: string; name: string; value: unknown; stroke: string }) => (
            <p key={p.dataKey} style={{ color: p.stroke, opacity: 0.75 }}>{p.name.replace(" (prev)", "")}: {fmt(p.value, p.dataKey)}</p>
          ))}
        </>
      )}
    </div>
  )
}

export function GscTrendChart({
  propertyId, startDate, endDate, device,
  selectedDate, onDateSelect,
  compareStart, compareEnd,
}: GscTrendChartProps) {
  const [data,    setData]    = useState<ChartPoint[]>([])
  const [cmpData, setCmpData] = useState<RawPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [active,  setActive]  = useState(() => new Set(["clicks", "impressions", "ctr"]))

  const hasComparison = !!(compareStart && compareEnd)

  useEffect(() => {
    if (!propertyId) return
    setLoading(true)
    const q = new URLSearchParams({ propertyId, startDate, endDate, device, groupBy: "date", limit: "500" })
    fetch(`/api/gsc/queries?${q}`)
      .then((r) => r.json())
      .then((d) => setData(sortAndFormat(d.rows ?? [])))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [propertyId, startDate, endDate, device])

  useEffect(() => {
    if (!propertyId || !compareStart || !compareEnd) { setCmpData([]); return }
    const q = new URLSearchParams({ propertyId, startDate: compareStart, endDate: compareEnd, device, groupBy: "date", limit: "500" })
    fetch(`/api/gsc/queries?${q}`)
      .then((r) => r.json())
      .then((d) => setCmpData(sortAndFormat(d.rows ?? [])))
      .catch(() => setCmpData([]))
  }, [propertyId, compareStart, compareEnd, device])

  const merged = useMemo<ChartPoint[]>(() => {
    if (!hasComparison || !cmpData.length) return data
    return data.map((d, i) => ({
      ...d,
      cmpDate:          cmpData[i]?.date,
      clicks_cmp:       cmpData[i]?.clicks,
      impressions_cmp:  cmpData[i]?.impressions,
      ctr_cmp:          cmpData[i]?.ctr,
    }))
  }, [data, cmpData, hasComparison])

  // Map formatted label → rawDate so onMouseMove can look up by activeLabel (more reliable than activeIndex).
  const dateMap = useMemo(() => {
    const m = new Map<string, string>()
    merged.forEach(p => m.set(p.date, p.rawDate))
    return m
  }, [merged])
  const dateMapRef  = useRef(dateMap)
  dateMapRef.current = dateMap
  const hoveredRef  = useRef<string | null>(null)

  function toggle(key: string) {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key) && next.size > 1) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const refX     = selectedDate ? fmtDate(selectedDate) : null
  const clickable = !!onDateSelect

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-700">Performance Over Time</h3>
          {clickable && <span className="text-xs text-gray-400">— click a point to filter table</span>}
          {selectedDate && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full">
              {fmtDate(selectedDate)}
              <button onClick={() => onDateSelect?.(null)} className="hover:text-blue-900 font-bold leading-none">×</button>
            </span>
          )}
          {hasComparison && (
            <span className="text-xs text-gray-400 italic">
              dashed: {compareStart} → {compareEnd}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {METRICS.map((m) => (
            <button key={m.key} onClick={() => toggle(m.key)}
              className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                active.has(m.key) ? "text-white border-transparent" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
              }`}
              style={active.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
            >{m.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-gray-50 animate-pulse rounded" />
      ) : merged.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">No data</div>
      ) : (
        <div style={clickable ? { cursor: "crosshair" } : {}}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={merged}
              margin={{ top: 4, right: 52, left: 0, bottom: 0 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onMouseMove={(state: any) => {
                const label: string | undefined = state?.activeLabel
                hoveredRef.current = label ? (dateMapRef.current.get(label) ?? null) : null
              }}
              onMouseLeave={() => { hoveredRef.current = null }}
              onClick={() => {
                if (!onDateSelect || !hoveredRef.current) return
                const raw = hoveredRef.current
                onDateSelect(raw === selectedDate ? null : raw)
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left"  tick={{ fontSize: 11 }} width={52} tickFormatter={(v) => Number(v).toLocaleString()} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={CmpTooltip} />
              {refX && <ReferenceLine yAxisId="left" x={refX} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" />}

              {METRICS.filter((m) => active.has(m.key)).map((m) => (
                <Line key={m.key} yAxisId={m.axis} type="monotone" dataKey={m.key}
                  name={m.label} stroke={m.color} strokeWidth={2} dot={false}
                  activeDot={{ r: 6, fill: m.color, stroke: "#fff", strokeWidth: 2 }}
                />
              ))}

              {hasComparison && METRICS.filter((m) => active.has(m.key)).map((m) => (
                <Line key={`${m.key}_cmp`} yAxisId={m.axis} type="monotone" dataKey={`${m.key}_cmp`}
                  name={`${m.label} (prev)`} stroke={m.color} strokeWidth={1.5}
                  strokeDasharray="5 3" strokeOpacity={0.45} dot={false} activeDot={{ r: 4 }} connectNulls />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
